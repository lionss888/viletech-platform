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

func TestPatchFormOrganizationID(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	root := authz.Principal{AccountID: seed.RootID, Role: domain.RoleRoot}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	form, err = forms.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatal(err)
	}
	if form.Status != formpayment.StatusDraft {
		t.Fatalf("want draft got %s", form.Status)
	}

	patched, err := forms.PatchForm(ctx, root, form.ID, service.NestPatchInput{
		OrganizationID: seed.BankOrgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if patched.OrganizationID != seed.BankOrgID {
		t.Fatalf("organization_id=%q want %q", patched.OrganizationID, seed.BankOrgID)
	}

	// Same parity as counterparty: org change remains allowed after submit.
	submitted, err := forms.Transition(ctx, user, form.ID, formpayment.ActionSubmit)
	if err != nil {
		t.Fatal(err)
	}
	repatched, err := forms.PatchForm(ctx, user, submitted.ID, service.NestPatchInput{
		OrganizationID: seed.OrgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if repatched.OrganizationID != seed.OrgID {
		t.Fatalf("after submit organization_id=%q want %q", repatched.OrganizationID, seed.OrgID)
	}
}

func TestDeleteFileRefRemovesDoc(t *testing.T) {
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
	form.DocsJSON = formpayment.EncodeDocRefs([]formpayment.DocFileRef{
		{FileID: "file-keep", Kind: "invoice"},
		{FileID: "file-gone", Kind: "contract"},
	}, nil)
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}

	next, err := forms.DeleteFileRef(ctx, user, form.ID, "file-gone")
	if err != nil {
		t.Fatal(err)
	}
	refs := formpayment.ParseDocRefs(next.DocsJSON)
	if len(refs) != 1 || refs[0].FileID != "file-keep" {
		t.Fatalf("refs=%v", refs)
	}
}
