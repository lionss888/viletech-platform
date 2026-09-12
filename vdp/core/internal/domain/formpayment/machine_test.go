package formpayment

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
)

func TestApplyTable(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name        string
		from        Status
		action      Action
		role        domain.Role
		orgApproved bool
		want        Status
		wantErr     bool
	}{
		{"creating to draft", StatusCreating, ActionRecognizeComplete, domain.RoleUser, false, StatusDraft, false},
		{"draft to org wait", StatusDraft, ActionSubmit, domain.RoleUser, false, StatusOrganizationWaitingVerification, false},
		{"draft to form wait if org approved", StatusDraft, ActionSubmit, domain.RoleUser, true, StatusFormWaitingVerification, false},
		{"user cannot ico start", StatusOrganizationWaitingVerification, ActionICOStart, domain.RoleUser, false, "", true},
		{"ico start", StatusOrganizationWaitingVerification, ActionICOStart, domain.RoleInternalComplianceOfficer, false, StatusOrganizationVerification, false},
		{"ico approve", StatusOrganizationVerification, ActionICOApprove, domain.RoleInternalComplianceOfficer, false, StatusFormWaitingVerification, false},
		{"eco start", StatusFormWaitingVerification, ActionECOStart, domain.RoleComplianceOfficer, true, StatusFormVerification, false},
		{"eco alias role", StatusFormWaitingVerification, ActionECOStart, domain.RoleExternalComplianceOfficer, true, StatusFormVerification, false},
		{"eco accept", StatusFormVerification, ActionECOAccept, domain.RoleComplianceOfficer, true, StatusFormAccepted, false},
		{"provider cannot accept form", StatusFormVerification, ActionECOAccept, domain.RoleProvider, true, "", true},
		{"manager send order", StatusFormAccepted, ActionManagerSendOrder, domain.RoleManager, true, StatusSigningOrder, false},
		{"user upload contract", StatusContractWaiting, ActionUserUploadContract, domain.RoleUser, true, StatusContractVerification, false},
		{"illegal skip completed", StatusDraft, ActionProviderSent, domain.RoleProvider, false, "", true},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := Apply(Command{
				Form:        Form{Status: tc.from, Direction: DirectionImport},
				Action:      tc.action,
				Role:        tc.role,
				OrgApproved: tc.orgApproved,
			})
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got status %s", got.Status)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Status != tc.want {
				t.Fatalf("status=%s want=%s", got.Status, tc.want)
			}
		})
	}
}

func TestImportTransitionCoverage(t *testing.T) {
	t.Parallel()
	if !IsAllowedTransition(StatusCreating, StatusDraft, DirectionImport, false) {
		t.Fatal("creating -> draft must be allowed")
	}
	if IsAllowedTransition(StatusDraft, StatusCompleted, DirectionImport, false) {
		t.Fatal("draft -> completed must be forbidden")
	}
	if !IsAllowedTransition(StatusPaymentSent, StatusReportWaiting, DirectionExport, false) {
		t.Fatal("export payment_sent -> report_waiting")
	}
	if !IsAllowedTransition(StatusPaymentSent, StatusReportWaiting, DirectionImport, false) {
		t.Fatal("import payment_sent -> report_waiting (Nest advance checkTransit)")
	}
	if !IsAllowedTransition(StatusReportWaiting, StatusReportWaitingVerification, DirectionImport, false) {
		t.Fatal("report_waiting -> report_waiting_verification (user report upload)")
	}
	if !IsAllowedTransition(StatusReportAccepted, StatusShipmentWaiting, DirectionImport, false) {
		t.Fatal("report_accepted -> shipment_waiting")
	}
	if !IsAllowedTransition(StatusReportVerification, StatusCompleted, DirectionImport, false) {
		t.Fatal("report_verification -> completed (confirm report closes deal)")
	}
	if !IsAllowedTransition(StatusReportWaiting, StatusCompleted, DirectionImport, false) {
		t.Fatal("report_waiting -> completed (Nest shortcut report/accept)")
	}
	if !IsAllowedTransition(StatusPaymentSent, StatusAdvanceSigningOrder, DirectionImport, true) {
		t.Fatal("rate-on-provider overlay missing")
	}
}

func TestCanSeeFormZones(t *testing.T) {
	t.Parallel()
	form := Form{AccountID: "user-1", ProviderID: "prov-1", Status: StatusFormAccepted}
	if !CanSeeForm(domain.RoleUser, "user-1", form) {
		t.Fatal("user should see own form")
	}
	if CanSeeForm(domain.RoleUser, "user-2", form) {
		t.Fatal("user should not see foreign form")
	}
	if !CanSeeForm(domain.RoleProvider, "prov-1", form) {
		t.Fatal("provider should see assigned form")
	}
	if CanSeeForm(domain.RoleProvider, "prov-2", form) {
		t.Fatal("provider should not see unassigned form")
	}
	if !CanSeeForm(domain.RoleManager, "any", form) {
		t.Fatal("manager sees non-draft forms")
	}
	draft := Form{AccountID: "user-1", Status: StatusDraft}
	if CanSeeForm(domain.RoleManager, "any", draft) {
		t.Fatal("manager must not see client draft")
	}
	creating := Form{AccountID: "user-1", Status: StatusCreating}
	if CanSeeForm(domain.RoleManager, "any", creating) {
		t.Fatal("manager must not see creating forms")
	}
	orgWait := Form{AccountID: "user-1", Status: StatusOrganizationWaitingVerification}
	if !CanSeeForm(domain.RoleManager, "any", orgWait) {
		t.Fatal("manager should see organization_waiting_verification")
	}
}

func TestProviderProjectionOmitsPII(t *testing.T) {
	t.Parallel()
	form := Form{
		ID:             "f1",
		AccountID:      "acc-secret",
		OrganizationID: "org1",
		ProviderID:     "prov1",
		Status:         StatusPaymentProcessing,
		InvoiceAmount:  "1000",
		Currency:       "USD",
	}
	view := ProjectForProvider(form)
	if view.ID != "f1" || view.InvoiceAmount != "1000" {
		t.Fatalf("unexpected view %#v", view)
	}
	encoded := mustJSON(view)
	for _, leak := range []string{"Ivan", "passport", "phone", "email", "acc-secret", "FullName"} {
		if contains(encoded, leak) {
			t.Fatalf("PII leak %q in %s", leak, encoded)
		}
	}
}

func TestParseExternalAlias(t *testing.T) {
	t.Parallel()
	role, ok := domain.ParseRole("external_compliance_officer")
	if !ok || role != domain.RoleComplianceOfficer {
		t.Fatalf("alias failed: %s %v", role, ok)
	}
}

func TestTreasurerConfirmImportAdvance(t *testing.T) {
	t.Parallel()
	got, err := Apply(Command{
		Form: Form{
			Status:        StatusPaymentReceived,
			Direction:     DirectionImport,
			PaymentMethod: PaymentMethodAdvance,
		},
		Action: ActionTreasurerConfirm,
		Role:   domain.RoleTreasurer,
	})
	if err != nil {
		t.Fatalf("advance confirm: %v", err)
	}
	if got.Status != StatusPaymentProcessing {
		t.Fatalf("status=%s want payment_processing", got.Status)
	}
}

func TestTreasurerConfirmEmptyMethodMVP(t *testing.T) {
	t.Parallel()
	got, err := Apply(Command{
		Form: Form{
			Status:    StatusPaymentReceived,
			Direction: DirectionImport,
		},
		Action: ActionTreasurerConfirm,
		Role:   domain.RoleTreasurer,
	})
	if err != nil {
		t.Fatalf("empty method confirm: %v", err)
	}
	if got.Status != StatusPaymentProcessing {
		t.Fatalf("status=%s want payment_processing", got.Status)
	}
}

func TestTreasurerConfirmPostPaymentRejected(t *testing.T) {
	t.Parallel()
	_, err := Apply(Command{
		Form: Form{
			Status:        StatusPaymentReceived,
			Direction:     DirectionImport,
			PaymentMethod: PaymentMethodPostPayment,
			// no RATE_ON_PP
		},
		Action: ActionTreasurerConfirm,
		Role:   domain.RoleTreasurer,
	})
	if err == nil {
		t.Fatal("expected conflict for post_payment without RATE_ON_PP")
	}
}

func TestTreasurerConfirmPostPaymentRateOnPP(t *testing.T) {
	t.Parallel()
	got, err := Apply(Command{
		Form: Form{
			Status:              StatusPaymentReceived,
			Direction:           DirectionImport,
			PaymentMethod:       PaymentMethodPostPayment,
			PlatformPostpayMode: PostpayRateOnProvider,
			RateOnProvider:      true,
		},
		Action: ActionTreasurerConfirm,
		Role:   domain.RoleTreasurer,
	})
	if err != nil {
		t.Fatalf("RATE_ON_PP confirm: %v", err)
	}
	if got.Status != StatusReportWaiting {
		t.Fatalf("status=%s want report_waiting", got.Status)
	}
}

func TestApplyImportPostpayDefaults(t *testing.T) {
	t.Parallel()
	form := Form{Direction: DirectionImport, PaymentMethod: PaymentMethodPostPayment}
	ApplyImportPostpayDefaults(&form)
	if form.PlatformPostpayMode != PostpayRateOnProvider || !form.RateOnProvider {
		t.Fatalf("defaults not applied: mode=%s rateOn=%v", form.PlatformPostpayMode, form.RateOnProvider)
	}
	form.PlatformPostpayMode = PostpayFixedRate
	form.RateOnProvider = false
	ApplyImportPostpayDefaults(&form)
	if form.PlatformPostpayMode != PostpayFixedRate {
		t.Fatal("must not overwrite explicit mode")
	}
}

func TestRateOnPPProviderFirstAndAdvanceOverlay(t *testing.T) {
	t.Parallel()
	if !IsAllowedTransition(StatusSigningOrderAccepted, StatusPaymentProcessing, DirectionImport, true) {
		t.Fatal("provider-first signing_order_accepted -> payment_processing")
	}
	if !IsAllowedTransition(StatusPaymentSent, StatusAdvanceSigningOrder, DirectionImport, true) {
		t.Fatal("payment_sent -> advance_signing_order with RATE_ON_PP")
	}
}

func TestTreasurerConfirmExportPayFromExport(t *testing.T) {
	t.Parallel()
	got, err := Apply(Command{
		Form: Form{
			Status:        StatusPaymentProcessing,
			Direction:     DirectionExport,
			PaymentMethod: PaymentMethodPayFromExport,
		},
		Action: ActionTreasurerConfirm,
		Role:   domain.RoleTreasurer,
	})
	if err != nil {
		t.Fatalf("export confirm: %v", err)
	}
	if got.Status != StatusPaymentSentTreasurer {
		t.Fatalf("status=%s want payment_sent_treasurer", got.Status)
	}
}

func TestTreasurerConfirmForbiddenRole(t *testing.T) {
	t.Parallel()
	_, err := Apply(Command{
		Form: Form{
			Status:        StatusPaymentReceived,
			Direction:     DirectionImport,
			PaymentMethod: PaymentMethodAdvance,
		},
		Action: ActionTreasurerConfirm,
		Role:   domain.RoleManager,
	})
	if err == nil {
		t.Fatal("manager must not treasurer_confirm")
	}
}
