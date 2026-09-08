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
	"github.com/viletech/vdp/shared/extraction"
)

func TestStartAndCancelExtraction(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	form, err = forms.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := forms.StartExtraction(ctx, user, form.ID); err != nil {
		t.Fatalf("start: %v", err)
	}

	draft := extraction.FixtureResult(form.ID)
	form.InvoiceJSON = extraction.ToInvoiceJSON(draft)
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}

	cancelled, err := forms.CancelExtraction(ctx, user, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if cancelled.InvoiceJSON != "" {
		t.Fatalf("want empty invoice_json after cancel, got %q", cancelled.InvoiceJSON)
	}
}
