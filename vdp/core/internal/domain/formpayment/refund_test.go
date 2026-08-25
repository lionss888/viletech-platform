package formpayment_test

import (
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
