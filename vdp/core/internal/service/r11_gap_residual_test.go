package service_test

import (
	"context"
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

func TestR11NoDocumentsSkipsOCR(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	svc := service.NewFormPaymentService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1", Currency: "USD", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if !form.NoDocuments {
		t.Fatal("no_documents flag")
	}
	pending, _ := box.Pending(ctx, 20)
	for _, e := range pending {
		if e.EventType == events.TypeOCRRequested {
			t.Fatal("OCR must not enqueue when no_documents")
		}
	}
}

func TestR11DeadlineNotifiesAndProviderSeesIt(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	svc := service.NewFormPaymentService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	form, _ := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1", Currency: "USD", NoDocuments: true})
	_, _ = svc.AssignProvider(ctx, manager, form.ID, seed.ProviderID, true)
	dl := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	form, err := svc.AssignDeadline(ctx, manager, form.ID, dl)
	if err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 20)
	var tg, mail bool
	for _, e := range pending {
		if e.EventType == events.TypeTelegramNotify {
			tg = true
		}
		if e.EventType == events.TypeMailNotify {
			mail = true
		}
	}
	if !tg || !mail {
		t.Fatalf("deadline notifications tg=%v mail=%v", tg, mail)
	}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}
	view, err := svc.GetProviderView(ctx, provider, form.ID)
	if err != nil || view.ExecutionDeadline == nil || formpayment.ContainsPII(view) {
		t.Fatalf("view err=%v pii=%v dl=%v", err, formpayment.ContainsPII(view), view.ExecutionDeadline)
	}
}

func TestR11ConfirmationCryptoRequiresHash(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}
	form, _ := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1", Currency: "USDT", NoDocuments: true})
	_, _ = svc.AssignProvider(ctx, manager, form.ID, seed.ProviderID, true)
	if _, err := svc.SetConfirmation(ctx, provider, form.ID, "", ""); err == nil {
		t.Fatal("crypto without hash must fail")
	}
	form, err := svc.SetConfirmation(ctx, provider, form.ID, "0xabc", "")
	if err != nil || form.ConfirmationHash == "" {
		t.Fatalf("err=%v hash=%s", err, form.ConfirmationHash)
	}
}

func TestR11VADedupeSingleModule(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	a, err := catalog.CreateVirtualAccount(ctx, user, domain.VirtualAccount{Kind: "fiat", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := catalog.CreateVirtualAccount(ctx, user, domain.VirtualAccount{Kind: "fiat", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	if a.ID != b.ID {
		t.Fatalf("expected VA dedupe got %s vs %s", a.ID, b.ID)
	}
	list, _ := catalog.ListVirtualAccounts(ctx, seed.UserID)
	if len(list) != 1 {
		t.Fatalf("want 1 VA got %d", len(list))
	}
}
