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
	"github.com/viletech/vdp/shared/extraction"
)

func TestAttachHsCodesPreservesExtractionMeta(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "EUR"})
	if err != nil {
		t.Fatal(err)
	}
	draft := extraction.FixtureResult(form.ID)
	draft.Meta.EngineID = "docling"
	form.InvoiceJSON = extraction.ToInvoiceJSON(draft)
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}

	updated, err := forms.AttachHsCodes(ctx, user, form.ID, []string{"8471"})
	if err != nil {
		t.Fatal(err)
	}
	parsed, ok := extraction.ParseFromInvoiceJSON(updated.InvoiceJSON)
	if !ok {
		t.Fatalf("expected extraction schema after AttachHsCodes, json=%s", updated.InvoiceJSON)
	}
	if parsed.Meta.EngineID != "docling" {
		t.Fatalf("engine_id wiped: %+v", parsed.Meta)
	}
	codes, err := forms.ListFormHsCodes(ctx, user, form.ID)
	if err != nil || len(codes) != 1 || codes[0] != "8471" {
		t.Fatalf("codes=%v err=%v", codes, err)
	}
}

func TestSaveFormKeepsNonEmptyExtractionInvoiceJSON(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	draft := extraction.FixtureResult(form.ID)
	draft.Meta.EngineID = "docling"
	form.InvoiceJSON = extraction.ToInvoiceJSON(draft)
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}
	loaded, err := forms.Get(ctx, user, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	parsed, ok := extraction.ParseFromInvoiceJSON(loaded.InvoiceJSON)
	if !ok || parsed.Meta.EngineID != "docling" {
		t.Fatalf("extraction lost on save/load: ok=%v json=%s", ok, loaded.InvoiceJSON)
	}
}
