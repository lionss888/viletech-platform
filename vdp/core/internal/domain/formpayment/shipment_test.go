package formpayment_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestShipmentOptionalBranchNotHappyPath(t *testing.T) {
	t.Parallel()
	// Verify report_accepted can go directly to completed (happy path)
	form := formpayment.Form{
		Status:    formpayment.StatusReportAccepted,
		Direction: formpayment.DirectionImport,
	}
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionComplete,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil {
		t.Fatalf("complete from report_accepted: %v", err)
	}
	if next.Status != formpayment.StatusCompleted {
		t.Fatalf("expected completed, got %s", next.Status)
	}
}

func TestShipmentHappyPathManagerInitiates(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status:    formpayment.StatusReportAccepted,
		Direction: formpayment.DirectionImport,
	}

	// Manager initiates shipment from report_accepted
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionShipmentWaiting,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaiting {
		t.Fatalf("shipment_waiting: %v %s", err, next.Status)
	}

	// User uploads shipment docs
	next, err = formpayment.Apply(formpayment.Command{
		Form:        next,
		Action:      formpayment.ActionShipmentUpload,
		Role:        domain.RoleUser,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaitingVerification {
		t.Fatalf("shipment upload: %v %s", err, next.Status)
	}

	// Manager starts verification
	next, err = formpayment.Apply(formpayment.Command{
		Form:        next,
		Action:      formpayment.ActionShipmentStart,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentVerification {
		t.Fatalf("shipment start: %v %s", err, next.Status)
	}

	// Manager accepts and completes
	next, err = formpayment.Apply(formpayment.Command{
		Form:        next,
		Action:      formpayment.ActionShipmentAccept,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusCompleted {
		t.Fatalf("shipment accept: %v %s", err, next.Status)
	}
}

func TestShipmentRejectAndCorrections(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status:    formpayment.StatusShipmentVerification,
		Direction: formpayment.DirectionImport,
	}

	// Manager rejects shipment docs
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionShipmentReject,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaitingCorrections {
		t.Fatalf("shipment reject: %v %s", err, next.Status)
	}

	// User resubmits corrected docs
	next, err = formpayment.Apply(formpayment.Command{
		Form:        next,
		Action:      formpayment.ActionShipmentUpload,
		Role:        domain.RoleUser,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaitingVerification {
		t.Fatalf("shipment resubmit: %v %s", err, next.Status)
	}
}

func TestShipmentStopAction(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status:    formpayment.StatusShipmentVerification,
		Direction: formpayment.DirectionImport,
	}

	// Manager stops verification (back to waiting)
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionShipmentStop,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaitingVerification {
		t.Fatalf("shipment stop: %v %s", err, next.Status)
	}
}

func TestShipmentUserAcceptAlternative(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status:    formpayment.StatusShipmentVerification,
		Direction: formpayment.DirectionImport,
	}

	// User can also accept shipment (alternative to manager accept)
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionShipmentAcceptUser,
		Role:        domain.RoleUser,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusCompleted {
		t.Fatalf("shipment accept user: %v %s", err, next.Status)
	}
}

func TestShipmentRolesAuthZ(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name       string
		status     formpayment.Status
		action     formpayment.Action
		role       domain.Role
		shouldFail bool
	}{
		{"manager can initiate shipment", formpayment.StatusReportAccepted, formpayment.ActionShipmentWaiting, domain.RoleManager, false},
		{"user cannot initiate shipment", formpayment.StatusReportAccepted, formpayment.ActionShipmentWaiting, domain.RoleUser, true},
		{"user can upload shipment", formpayment.StatusShipmentWaiting, formpayment.ActionShipmentUpload, domain.RoleUser, false},
		{"provider cannot upload shipment", formpayment.StatusShipmentWaiting, formpayment.ActionShipmentUpload, domain.RoleProvider, true},
		{"manager can start verification", formpayment.StatusShipmentWaitingVerification, formpayment.ActionShipmentStart, domain.RoleManager, false},
		{"user cannot start verification", formpayment.StatusShipmentWaitingVerification, formpayment.ActionShipmentStart, domain.RoleUser, true},
		{"manager can accept", formpayment.StatusShipmentVerification, formpayment.ActionShipmentAccept, domain.RoleManager, false},
		{"manager can reject", formpayment.StatusShipmentVerification, formpayment.ActionShipmentReject, domain.RoleManager, false},
		{"user can accept", formpayment.StatusShipmentVerification, formpayment.ActionShipmentAcceptUser, domain.RoleUser, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			form := formpayment.Form{
				Status:    tc.status,
				Direction: formpayment.DirectionImport,
			}
			_, err := formpayment.Apply(formpayment.Command{
				Form:        form,
				Action:      tc.action,
				Role:        tc.role,
				OrgApproved: true,
			})
			if tc.shouldFail && err == nil {
				t.Errorf("expected error for %s but got none", tc.name)
			}
			if !tc.shouldFail && err != nil {
				t.Errorf("unexpected error for %s: %v", tc.name, err)
			}
		})
	}
}

func TestShipmentFromPaymentSent(t *testing.T) {
	t.Parallel()
	// Shipment can also be initiated from payment_sent (alternative entry)
	form := formpayment.Form{
		Status:    formpayment.StatusPaymentSent,
		Direction: formpayment.DirectionImport,
	}

	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionShipmentWaiting,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaiting {
		t.Fatalf("shipment from payment_sent: %v %s", err, next.Status)
	}
}

func TestShipmentFromAdvanceSigningOrderAccepted(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status:    formpayment.StatusAdvanceSigningOrderAccepted,
		Direction: formpayment.DirectionImport,
	}
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionShipmentWaiting,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusShipmentWaiting {
		t.Fatalf("shipment from advance_signing_order_accepted: %v %s", err, next.Status)
	}
}

func TestReportAcceptCompletesWithoutShipment(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status:    formpayment.StatusReportVerification,
		Direction: formpayment.DirectionImport,
	}
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      formpayment.ActionReportAccept,
		Role:        domain.RoleManager,
		OrgApproved: true,
	})
	if err != nil {
		t.Fatalf("report_accept: %v", err)
	}
	if next.Status != formpayment.StatusCompleted {
		t.Fatalf("happy path report_accept must land completed, got %s", next.Status)
	}
}
