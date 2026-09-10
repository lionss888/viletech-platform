package seed_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
)

func TestDevSeedsAccountsAndOrgsOnly(t *testing.T) {
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	accounts, err := store.ListAccounts(context.Background())
	if err != nil {
		t.Fatalf("list accounts: %v", err)
	}
	if len(accounts) < 7 {
		t.Fatalf("expected >=7 seed accounts, got %d", len(accounts))
	}
	org, err := store.OrganizationByID(context.Background(), seed.OrgID)
	if err != nil {
		t.Fatalf("org: %v", err)
	}
	if org.Status != domain.OrgApproved || !org.IsActive {
		t.Fatalf("pilot org want approved+active, got status=%s active=%v", org.Status, org.IsActive)
	}
	cps, err := store.ListCounterparties(context.Background())
	if err != nil {
		t.Fatalf("counterparties: %v", err)
	}
	if len(cps) != 0 {
		t.Fatalf("seed must not create counterparties, got %d", len(cps))
	}
	chats, err := store.ListWorkChats(context.Background())
	if err != nil {
		t.Fatalf("work chats: %v", err)
	}
	if len(chats) != 0 {
		t.Fatalf("seed must not create work chats, got %d", len(chats))
	}
	if len(store.ListForms(context.Background())) != 0 {
		t.Fatal("seed must not create forms")
	}
}

func TestWipeFormsClearsProbeData(t *testing.T) {
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	ctx := context.Background()
	form := formpayment.Form{
		ID:             "wipe-form-1",
		AccountID:      seed.UserID,
		OrganizationID: seed.OrgID,
		Status:         formpayment.StatusDraft,
		Direction:      formpayment.DirectionImport,
		Kind:           formpayment.KindGood,
	}
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatalf("save form: %v", err)
	}
	_ = store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: "h1", FormPaymentID: form.ID, ActorID: seed.UserID,
		FromStatus: formpayment.StatusCreating, ToStatus: formpayment.StatusDraft,
	})
	if err := seed.WipeForms(store); err != nil {
		t.Fatalf("wipe: %v", err)
	}
	if len(store.ListForms(ctx)) != 0 {
		t.Fatal("expected 0 forms after wipe")
	}
	if len(store.HistoryByForm(ctx, form.ID)) != 0 {
		t.Fatal("expected history cleared with form")
	}
}

func TestShouldWipeForms(t *testing.T) {
	t.Setenv("SEED_WIPE_FORMS", "")
	if !seed.ShouldWipeForms("development") {
		t.Fatal("development should wipe by default")
	}
	if !seed.ShouldWipeForms("alpha") {
		t.Fatal("alpha should wipe by default (manual QA + post-e2e cleanup)")
	}
	if seed.ShouldWipeForms("production") {
		t.Fatal("production must never wipe")
	}
	if seed.ShouldWipeForms("demo") {
		t.Fatal("demo without flag must not wipe")
	}
	if seed.ShouldWipeForms("beta") {
		t.Fatal("beta without flag must not wipe")
	}
	t.Setenv("SEED_WIPE_FORMS", "0")
	if seed.ShouldWipeForms("development") {
		t.Fatal("SEED_WIPE_FORMS=0 disables wipe")
	}
	if seed.ShouldWipeForms("alpha") {
		t.Fatal("SEED_WIPE_FORMS=0 disables wipe on alpha")
	}
	t.Setenv("SEED_WIPE_FORMS", "1")
	if !seed.ShouldWipeForms("demo") {
		t.Fatal("SEED_WIPE_FORMS=1 must wipe even on demo")
	}
	if !seed.ShouldWipeForms("development") {
		t.Fatal("SEED_WIPE_FORMS=1 enables wipe on development")
	}
}
