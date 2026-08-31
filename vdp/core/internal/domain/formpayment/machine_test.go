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
	if !IsAllowedTransition(StatusPaymentSent, StatusAdvanceSigningOrder, DirectionImport, true) {
		t.Fatal("rate-on-provider overlay missing")
	}
}

func TestCanSeeFormZones(t *testing.T) {
	t.Parallel()
	form := Form{AccountID: "user-1", ProviderID: "prov-1"}
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
		t.Fatal("manager sees all")
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
