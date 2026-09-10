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

func TestSetConfirmationAttachesPaymentDoc(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	form, _ = forms.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	form, _ = forms.Transition(ctx, user, form.ID, formpayment.ActionSubmit)
	// Fast-forward via manager assign provider path is heavy; set provider + status directly for unit focus.
	form.ProviderID = seed.ProviderID
	form.Status = formpayment.StatusPaymentProcessing
	_ = store.SaveForm(ctx, form)

	next, err := forms.SetConfirmation(ctx, provider, form.ID, "", "file-pay-1")
	if err != nil {
		t.Fatal(err)
	}
	if next.ConfirmationFileID != "file-pay-1" {
		t.Fatalf("confirmation file: %s", next.ConfirmationFileID)
	}
	refs := formpayment.ParseDocRefs(next.DocsJSON)
	found := false
	for _, ref := range refs {
		if ref.FileID == "file-pay-1" && ref.Kind == "payment" {
			found = true
		}
	}
	if !found {
		t.Fatalf("payment doc missing in docs_json: %s", next.DocsJSON)
	}
	_ = manager
}
