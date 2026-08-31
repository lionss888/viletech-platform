package formpayment

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
)

func TestNestActionMapCoversStatusPaths(t *testing.T) {
	t.Parallel()
	required := []string{
		"site|cancel", "site|form/accept", "site|form/accept-corrections", "site|order", "site|order-advance",
		"site|report", "site|shipment", "site|shipment/accept", "site|signing-order-verification-treasurer",
		"manager|cancel", "manager|completed", "manager|form/start", "manager|form/stop", "manager|form/accept", "manager|form/reject",
		"manager|order/start", "manager|order/stop", "manager|order/accept", "manager|order/reject", "manager|order/signing",
		"manager|order-advance/start", "manager|order-advance/stop", "manager|order-advance/accept", "manager|order-advance/reject",
		"manager|order-advance/revoke", "manager|order-advance/signing",
		"manager|payment/received", "manager|payment/start", "manager|payment/stop", "manager|payment/sent",
		"manager|payment/return-to-sent", "manager|payment/cancel",
		"manager|shipment/waiting", "manager|shipment/start", "manager|shipment/stop", "manager|shipment/accept", "manager|shipment/reject",
		"manager|report/start", "manager|report/stop", "manager|report/accept", "manager|report/reject", "manager|report/revoke",
		"manager|report/signing", "manager|report",
		"manager|refund/init", "manager|refund/start", "manager|refund/stop", "manager|refund/sent", "manager|refund/cancel",
		"provider|payment/received", "provider|payment/start", "provider|payment/stop", "provider|payment/sent",
		"provider|payment/cancel", "provider|form/manager",
		"eco|cancel", "eco|form/start", "eco|form/stop", "eco|form/accept", "eco|form/reject",
		"ico|cancel", "ico|form/start", "ico|form/stop", "ico|form/accept", "ico|form/reject",
		"treasurer|confirm-payment", "treasurer|signing-order-treasurer", "treasurer|return-to-payment-sent-treasurer",
		"treasurer|order-waiting-correction-treasurer", "treasurer|complete-from-verification-treasurer",
		"treasurer|return-to-signing-order-treasurer",
	}
	if len(nestActionMap) < len(required) {
		t.Fatalf("nestActionMap size %d < required %d", len(nestActionMap), len(required))
	}
	for _, key := range required {
		if _, ok := nestActionMap[key]; !ok {
			t.Fatalf("missing nestActionMap key %s", key)
		}
		role, path, _ := splitKey(key)
		action, ok := NestPathAction(role, path)
		if !ok || action == "" {
			t.Fatalf("NestPathAction failed for %s", key)
		}
		if RolesForAction(action) == nil {
			t.Fatalf("no roles for action %s (%s)", action, key)
		}
	}
}

func splitKey(key string) (role, path string, ok bool) {
	for i := 0; i < len(key); i++ {
		if key[i] == '|' {
			return key[:i], key[i+1:], true
		}
	}
	return "", "", false
}

func TestTransitionTablesImportExportRateOnPP(t *testing.T) {
	t.Parallel()
	for from, targets := range transitionsImportForm {
		for _, to := range targets {
			if !IsAllowedTransition(from, to, DirectionImport, false) {
				t.Fatalf("import table missing %s -> %s", from, to)
			}
		}
	}
	for from, targets := range transitionsExportForm {
		for _, to := range targets {
			if !IsAllowedTransition(from, to, DirectionExport, false) {
				t.Fatalf("export overlay missing %s -> %s", from, to)
			}
		}
	}
	for from, targets := range transitionsImportFormRateOnProviderPostpay {
		for _, to := range targets {
			if !IsAllowedTransition(from, to, DirectionImport, true) {
				t.Fatalf("rate-on-pp overlay missing %s -> %s", from, to)
			}
		}
	}
}

func TestApplyManagerOrderAndECOChain(t *testing.T) {
	t.Parallel()
	steps := []struct {
		from   Status
		action Action
		role   domain.Role
		want   Status
	}{
		{StatusFormWaitingVerification, ActionECOStart, domain.RoleComplianceOfficer, StatusFormVerification},
		{StatusFormVerification, ActionECOAccept, domain.RoleComplianceOfficer, StatusFormAccepted},
		{StatusFormAccepted, ActionOrderSigning, domain.RoleManager, StatusSigningOrder},
		{StatusSigningOrder, ActionUserUploadOrder, domain.RoleUser, StatusSigningOrderWaitingVerification},
		{StatusSigningOrderWaitingVerification, ActionOrderStart, domain.RoleManager, StatusSigningOrderVerification},
		{StatusSigningOrderVerification, ActionOrderAccept, domain.RoleManager, StatusSigningOrderAccepted},
		{StatusSigningOrderAccepted, ActionPaymentReceived, domain.RoleManager, StatusPaymentReceived},
	}
	for _, step := range steps {
		got, err := Apply(Command{Form: Form{Status: step.from, Direction: DirectionImport}, Action: step.action, Role: step.role, OrgApproved: true})
		if err != nil {
			t.Fatalf("%s %s: %v", step.from, step.action, err)
		}
		if got.Status != step.want {
			t.Fatalf("%s %s => %s want %s", step.from, step.action, got.Status, step.want)
		}
	}
}

func TestForbiddenRoleAndIllegalTransition(t *testing.T) {
	t.Parallel()
	_, err := Apply(Command{
		Form: Form{Status: StatusFormVerification, Direction: DirectionImport},
		Action: ActionECOAccept, Role: domain.RoleProvider, OrgApproved: true,
	})
	if err == nil {
		t.Fatal("provider must not ECO accept")
	}
	_, err = Apply(Command{
		Form: Form{Status: StatusDraft, Direction: DirectionImport},
		Action: ActionPaymentSent, Role: domain.RoleManager, OrgApproved: true,
	})
	if err == nil {
		t.Fatal("illegal draft->payment_sent must conflict")
	}
}
