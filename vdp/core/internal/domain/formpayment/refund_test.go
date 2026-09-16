package formpayment_test

import (
	"strings"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestRefundInvariantBlocksCancelWhileFundsHeld(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status: formpayment.StatusManagerChecking, FundsHeld: true,
		FundsReceivedAmount: "1000", FundsReceivedCurrency: "USD", InvoiceAmount: "1000", Currency: "USD",
	}
	_, err := formpayment.Apply(formpayment.Command{
		Form: form, Action: formpayment.ActionCancelByManager, Role: domain.RoleManager, OrgApproved: true,
	})
	if err == nil {
		t.Fatal("expected conflict cancel while funds held")
	}
}

func TestRefundHappyPathAndCancelAfterSent(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status: formpayment.StatusPaymentReceived, InvoiceAmount: "500", Currency: "EUR",
	}
	next, err := formpayment.Apply(formpayment.Command{
		Form: form, Action: formpayment.ActionPaymentReceived, Role: domain.RoleManager, OrgApproved: true,
	})
	// already payment_received — no-op
	_ = next
	form.Status = formpayment.StatusSigningOrderAccepted
	form.MarkFundsReceived()
	next, err = formpayment.Apply(formpayment.Command{
		Form: form, Action: formpayment.ActionRefundInit, Role: domain.RoleManager, OrgApproved: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if next.Status != formpayment.StatusPaymentRefundWaiting || !next.FundsHeld {
		t.Fatalf("%#v", next)
	}
	next, err = formpayment.Apply(formpayment.Command{
		Form: next, Action: formpayment.ActionRefundStart, Role: domain.RoleManager, OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusPaymentRefundProcessing {
		t.Fatalf("%v %#v", err, next)
	}
	next, err = formpayment.Apply(formpayment.Command{
		Form: next, Action: formpayment.ActionRefundSent, Role: domain.RoleManager, OrgApproved: true,
	})
	if err != nil || next.Status != formpayment.StatusPaymentRefundSent || !next.FundsRefunded || next.FundsHeld {
		t.Fatalf("%v %#v", err, next)
	}
	canceled, err := formpayment.Apply(formpayment.Command{
		Form: next, Action: formpayment.ActionCancelByManager, Role: domain.RoleManager, OrgApproved: true,
	})
	if err != nil {
		t.Fatalf("cancel after refund sent: %v", err)
	}
	if canceled.Status != formpayment.StatusCanceledByManager {
		t.Fatalf("status=%s", canceled.Status)
	}
}

func TestValidateRefundAmount(t *testing.T) {
	t.Parallel()
	f := formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"}
	if err := f.ValidateRefundAmount("1000", "USD"); err != nil {
		t.Fatal(err)
	}
	if err := f.ValidateRefundAmount("999", "USD"); err == nil {
		t.Fatal("amount mismatch")
	}
	if err := f.ValidateRefundAmount("1000", "EUR"); err == nil {
		t.Fatal("currency mismatch")
	}
}

func TestRefundStopAndCancel(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{
		Status: formpayment.StatusPaymentRefundProcessing,
		FundsHeld: true,
		FundsReceivedAmount: "1000",
		FundsReceivedCurrency: "USD",
	}
	
	// Test ActionRefundStop: processing -> waiting
	next, err := formpayment.Apply(formpayment.Command{
		Form: form, Action: formpayment.ActionRefundStop, Role: domain.RoleManager, OrgApproved: true,
	})
	if err != nil {
		t.Fatalf("refund_stop failed: %v", err)
	}
	if next.Status != formpayment.StatusPaymentRefundWaiting {
		t.Fatalf("expected payment_refund_waiting, got %s", next.Status)
	}
	
	// Test ActionRefundCancel: should return to previous status
	form.PrevStatus = formpayment.StatusSigningOrderAccepted
	next, err = formpayment.Apply(formpayment.Command{
		Form: form, Action: formpayment.ActionRefundCancel, Role: domain.RoleManager, OrgApproved: true,
	})
	if err != nil {
		t.Fatalf("refund_cancel failed: %v", err)
	}
	if next.Status != formpayment.StatusSigningOrderAccepted {
		t.Fatalf("expected signing_order_accepted, got %s", next.Status)
	}
}

func TestRefundInvariantBlocksMultipleCancelStatuses(t *testing.T) {
	t.Parallel()
	
	testCases := []struct {
		action formpayment.Action
		role   domain.Role
	}{
		{formpayment.ActionCancel, domain.RoleUser},
		{formpayment.ActionCancelByManager, domain.RoleManager},
		{formpayment.ActionCancelByECO, domain.RoleExternalComplianceOfficer},
		{formpayment.ActionCancelByICO, domain.RoleInternalComplianceOfficer},
	}
	
	for _, tc := range testCases {
		form := formpayment.Form{
			Status: formpayment.StatusManagerChecking,
			FundsHeld: true,
			FundsRefunded: false,
			FundsReceivedAmount: "1000",
			FundsReceivedCurrency: "USD",
		}
		
		_, err := formpayment.Apply(formpayment.Command{
			Form: form, Action: tc.action, Role: tc.role, OrgApproved: true,
		})
		if err == nil {
			t.Errorf("expected error for %s while funds held", tc.action)
		}
	}
}

func TestRefundAmountValidationEdgeCases(t *testing.T) {
	t.Parallel()
	
	testCases := []struct {
		name         string
		form         formpayment.Form
		amount       string
		currency     string
		shouldFail   bool
		expectedErr  string
	}{
		{
			name: "valid exact match",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "1000",
			currency: "USD",
			shouldFail: false,
		},
		{
			name: "amount too low",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "999",
			currency: "USD",
			shouldFail: true,
			expectedErr: "must equal received funds",
		},
		{
			name: "amount too high",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "1001",
			currency: "USD",
			shouldFail: true,
			expectedErr: "must equal received funds",
		},
		{
			name: "zero amount",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "0",
			currency: "USD",
			shouldFail: true,
			expectedErr: "must be positive",
		},
		{
			name: "negative amount",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "-100",
			currency: "USD",
			shouldFail: true,
			expectedErr: "must be positive",
		},
		{
			name: "currency mismatch",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "1000",
			currency: "EUR",
			shouldFail: true,
			expectedErr: "must match received funds currency",
		},
		{
			name: "invalid amount format",
			form: formpayment.Form{FundsReceivedAmount: "1000.00", FundsReceivedCurrency: "USD"},
			amount: "abc",
			currency: "USD",
			shouldFail: true,
			expectedErr: "invalid refund amount",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.form.ValidateRefundAmount(tc.amount, tc.currency)
			if tc.shouldFail {
				if err == nil {
					t.Fatalf("expected error containing '%s', got nil", tc.expectedErr)
				}
				if tc.expectedErr != "" && !strings.Contains(err.Error(), tc.expectedErr) {
					t.Fatalf("expected error containing '%s', got: %v", tc.expectedErr, err)
				}
			} else {
				if err != nil {
					t.Fatalf("expected no error, got: %v", err)
				}
			}
		})
	}
}
