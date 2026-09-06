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

func TestMultiOrderMainAndAdvanceActiveForProvider(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	eco := authz.Principal{AccountID: seed.ECOID, Role: domain.RoleComplianceOfficer}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}

	org, err := store.OrganizationByID(ctx, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	org.Status = domain.OrgApproved
	org.IsActive = true
	_ = store.SaveOrganization(ctx, org)

	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1000", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	mustTrans := func(p authz.Principal, a formpayment.Action) {
		t.Helper()
		var e error
		form, e = svc.Transition(ctx, p, form.ID, a)
		if e != nil {
			t.Fatalf("%s from %s: %v", a, form.Status, e)
		}
	}
	mustTrans(user, formpayment.ActionRecognizeComplete)
	mustTrans(user, formpayment.ActionSubmit)
	mustTrans(eco, formpayment.ActionECOStart)
	mustTrans(eco, formpayment.ActionECOAccept)
	mustTrans(manager, formpayment.ActionOrderSigning)
	mustTrans(user, formpayment.ActionUserUploadOrder)
	mustTrans(manager, formpayment.ActionOrderStart)
	mustTrans(manager, formpayment.ActionOrderAccept)

	orders, err := svc.ListOrders(ctx, manager, form.ID)
	if err != nil || len(orders) != 1 || orders[0].Kind != formpayment.OrderKindMain {
		t.Fatalf("main order: %#v err=%v", orders, err)
	}
	active, err := svc.GetActiveOrder(ctx, manager, form.ID)
	if err != nil || active.Kind != formpayment.OrderKindMain {
		t.Fatalf("active main: %#v err=%v", active, err)
	}
	mainID := active.ID

	mustTrans(manager, formpayment.ActionAdvanceSigning)
	mustTrans(user, formpayment.ActionAdvanceUserUpload)
	mustTrans(manager, formpayment.ActionAdvanceStart)
	mustTrans(manager, formpayment.ActionAdvanceAccept)

	orders, err = svc.ListOrders(ctx, manager, form.ID)
	if err != nil || len(orders) < 2 {
		t.Fatalf("want 2 orders got %#v err=%v", orders, err)
	}
	active, err = svc.GetActiveOrder(ctx, manager, form.ID)
	if err != nil || active.Kind != formpayment.OrderKindAdvance || active.ID == mainID {
		t.Fatalf("active advance: %#v err=%v", active, err)
	}

	if _, err := svc.AssignProvider(ctx, manager, form.ID, seed.ProviderID, true); err != nil {
		t.Fatal(err)
	}
	view, err := svc.GetProviderView(ctx, provider, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if view.ActiveOrder == nil || view.ActiveOrder.Kind != formpayment.OrderKindAdvance {
		t.Fatalf("provider active=%#v", view.ActiveOrder)
	}
	if view.ActiveOrderID != active.ID {
		t.Fatalf("active_order_id=%s want %s", view.ActiveOrderID, active.ID)
	}
}
