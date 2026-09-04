package service_test

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/events"
)

func TestR9LiquidityMatchAndVAAdjust(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	n := 0
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string {
		n++
		return "r9-" + strconv.Itoa(n)
	})
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}

	offer, err := catalog.CreateLiquidity(ctx, provider, domain.LiquidityOffer{
		Direction: "import", Amount: "500", Currency: "USD",
	})
	if err != nil {
		t.Fatal(err)
	}
	if offer.Status != "open" || offer.ProviderID != seed.ProviderID {
		t.Fatalf("offer=%#v", offer)
	}

	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), func() string { return "form-liq" })
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "500", Currency: "USD", Direction: formpayment.DirectionImport})
	if err != nil {
		t.Fatal(err)
	}
	matched, err := catalog.MatchLiquidityToForm(ctx, manager, offer.ID, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if matched.Status != "matched" || matched.FormID != form.ID {
		t.Fatalf("matched=%#v", matched)
	}
	gotForm, _ := store.FormByID(ctx, form.ID)
	if gotForm.ProviderID != seed.ProviderID {
		t.Fatalf("provider=%s", gotForm.ProviderID)
	}

	va, err := catalog.CreateVirtualAccount(ctx, user, domain.VirtualAccount{Currency: "USD", Kind: "fiat"})
	if err != nil {
		t.Fatal(err)
	}
	adj, err := catalog.AdjustVirtualAccount(ctx, manager, va.ID, "12.5")
	if err != nil {
		t.Fatal(err)
	}
	if adj.Balance != "12.50" {
		t.Fatalf("balance=%s", adj.Balance)
	}
}

func TestR9TreasurerTaskAgentHsAndMailSSE(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	bus := service.NewFormEventBus()
	id := 0
	newID := func() string {
		id++
		return "id" + strconv.Itoa(id)
	}
	catalog := service.NewCatalogService(store, box, newID)
	forms := service.NewFormPaymentService(store, box, newID).WithEventBus(bus)
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	treasurer := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleTreasurer}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	agent, err := catalog.CreateAgent(ctx, manager, domain.Agent{Name: "Agent R9", INN: "7707083893"})
	if err != nil {
		t.Fatal(err)
	}
	if !agent.Active {
		t.Fatal("agent inactive")
	}
	_, err = catalog.CreateHsCode(ctx, manager, domain.HsCode{Code: "8471", Description: "computers"})
	if err != nil {
		t.Fatal(err)
	}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "EUR"})
	if err != nil {
		t.Fatal(err)
	}
	form, err = forms.AttachHsCodes(ctx, user, form.ID, []string{"8471", "8517"})
	if err != nil {
		t.Fatal(err)
	}
	codes, err := forms.ListFormHsCodes(ctx, user, form.ID)
	if err != nil || len(codes) != 2 {
		t.Fatalf("codes=%v err=%v", codes, err)
	}

	task, err := catalog.CreateTreasurerTaskFull(ctx, treasurer, domain.TreasurerTask{
		FormPaymentID: form.ID, Kind: "confirm", Amount: "10", Currency: "EUR",
	})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := catalog.UpdateTreasurerTask(ctx, treasurer, task.ID, "done", seed.ManagerID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Status != "done" {
		t.Fatalf("task=%#v", updated)
	}

	ch := bus.Subscribe(form.ID)
	defer bus.Unsubscribe(form.ID, ch)
	form, err = forms.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatal(err)
	}
	select {
	case ev := <-ch:
		if ev.Type != "status_changed" || ev.FormPaymentID != form.ID {
			t.Fatalf("ev=%#v", ev)
		}
	case <-time.After(time.Second):
		t.Fatal("expected SSE status_changed")
	}

	// Force a mail-worthy transition via direct status + afterStatusChanged path: form_accepted mail on ECO accept needs long chain.
	// Enqueue mail explicitly through catalog and assert TypeMailNotify from Transition to form_accepted via Apply on drafted form.
	form.Status = formpayment.StatusFormVerification
	_ = store.SaveForm(ctx, form)
	org, _ := store.OrganizationByID(ctx, seed.OrgID)
	org.Status = domain.OrgApproved
	org.IsActive = true
	_ = store.SaveOrganization(ctx, org)
	eco := authz.Principal{AccountID: seed.ECOID, Role: domain.RoleComplianceOfficer}
	_, err = forms.Transition(ctx, eco, form.ID, formpayment.ActionECOAccept)
	if err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 50)
	foundMail := false
	for _, e := range pending {
		if e.EventType == events.TypeMailNotify {
			foundMail = true
			break
		}
	}
	if !foundMail {
		t.Fatalf("expected mail.notify in outbox, got %d events", len(pending))
	}
}
