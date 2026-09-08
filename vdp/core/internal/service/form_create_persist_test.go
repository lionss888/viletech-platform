package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestCreatePersistsCounterpartyAndHsCodes(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	cp, err := catalog.CreateCounterparty(ctx, user, "Persist CP Ltd", "CN", "998877", `[]`)
	if err != nil {
		t.Fatal(err)
	}

	form, err := forms.Create(ctx, user, service.CreateInput{
		InvoiceAmount:  "1250.50",
		Currency:       "USD",
		CounterpartyID: cp.ID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if form.CounterpartyID != cp.ID {
		t.Fatalf("counterparty_id=%q want %q", form.CounterpartyID, cp.ID)
	}
	if form.InvoiceAmount != "1250.50" || form.Currency != "USD" {
		t.Fatalf("amount/currency=%s %s", form.InvoiceAmount, form.Currency)
	}

	got, err := forms.Get(ctx, user, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.CounterpartyID != cp.ID {
		t.Fatalf("GET counterparty_id=%q", got.CounterpartyID)
	}

	form, err = forms.AttachHsCodes(ctx, user, form.ID, []string{"8542 31 90"})
	if err != nil {
		t.Fatal(err)
	}
	codes, err := forms.ListFormHsCodes(ctx, user, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(codes) != 1 || codes[0] != "8542 31 90" {
		t.Fatalf("hs codes=%v", codes)
	}
	_ = form
}
