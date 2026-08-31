package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestRefundServiceHappyPathBlockCancelAndFile(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	eco := authz.Principal{AccountID: seed.ECOID, Role: domain.RoleComplianceOfficer}

	org, _ := store.OrganizationByID(ctx, seed.OrgID)
	org.Status = domain.OrgApproved
	org.IsActive = true
	_ = store.SaveOrganization(ctx, org)

	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1000", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	trans := func(p authz.Principal, a formpayment.Action) {
		t.Helper()
		var e error
		form, e = svc.Transition(ctx, p, form.ID, a)
		if e != nil {
			t.Fatalf("%s as %s from %s: %v", a, p.Role, form.Status, e)
		}
	}
	trans(user, formpayment.ActionRecognizeComplete)
	trans(user, formpayment.ActionSubmit)
	trans(eco, formpayment.ActionECOStart)
	trans(eco, formpayment.ActionECOAccept)
	trans(manager, formpayment.ActionOrderSigning)
	trans(user, formpayment.ActionUserUploadOrder)
	trans(manager, formpayment.ActionOrderStart)
	trans(manager, formpayment.ActionOrderAccept)
	trans(manager, formpayment.ActionPaymentReceived)
	form.UnpackDocsJSON()
	if !form.FundsHeld {
		t.Fatal("funds should be held after payment received")
	}

	if _, err := svc.Transition(ctx, manager, form.ID, formpayment.ActionCancelByManager); err == nil {
		t.Fatal("cancel must be blocked while funds held")
	}

	form, err = svc.InitRefund(ctx, manager, form.ID, "1000", "USD", "client request")
	if err != nil {
		t.Fatal(err)
	}
	if form.Status != formpayment.StatusPaymentRefundWaiting {
		t.Fatalf("status=%s", form.Status)
	}
	form, err = svc.AttachRefundFile(ctx, manager, form.ID, "file-refund-1")
	if err != nil {
		t.Fatal(err)
	}
	if form.RefundFileID != "file-refund-1" {
		t.Fatalf("file=%s", form.RefundFileID)
	}
	trans(manager, formpayment.ActionRefundStart)
	form, err = svc.ConfirmRefundSent(ctx, manager, form.ID, "wired")
	if err != nil {
		t.Fatal(err)
	}
	form.UnpackDocsJSON()
	if !form.FundsRefunded || form.HasUnrefundedFunds() {
		t.Fatalf("refunded flags held=%v refunded=%v", form.FundsHeld, form.FundsRefunded)
	}
	view, err := svc.GetRefundProcess(ctx, manager, form.ID)
	if err != nil || view.UnrefundedBlocksCancel {
		t.Fatalf("view=%#v err=%v", view, err)
	}
	trans(manager, formpayment.ActionCancelByManager)
	if form.Status != formpayment.StatusCanceledByManager {
		t.Fatalf("status=%s", form.Status)
	}
}
