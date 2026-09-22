package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/shared/events"
)

func stampInvoice(t *testing.T, store repository.Store, ctx context.Context, formID string) {
	t.Helper()
	stampDocs(t, store, ctx, formID, formpayment.DocFileRef{FileID: "invoice-fixture", Kind: "invoice", Label: "invoice.pdf"})
}

func stampDocs(t *testing.T, store repository.Store, ctx context.Context, formID string, extra ...formpayment.DocFileRef) {
	t.Helper()
	form, err := store.FormByID(ctx, formID)
	if err != nil {
		t.Fatal(err)
	}
	refs := append(formpayment.ParseDocRefs(form.DocsJSON), extra...)
	form.DocsJSON = formpayment.EncodeDocRefs(refs, nil)
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}
}

func TestConfirmRequiresInvoice(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	enableComplianceActors(t, svc)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	eco := authz.Principal{AccountID: seed.ECOID, Role: domain.RoleComplianceOfficer}
	org, err := store.OrganizationByID(ctx, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	org.Status = domain.OrgApproved
	org.IsActive = true
	if err := store.SaveOrganization(ctx, org); err != nil {
		t.Fatal(err)
	}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "100", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Transition(ctx, user, form.ID, formpayment.ActionSubmit); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Transition(ctx, eco, form.ID, formpayment.ActionECOStart); err != nil {
		t.Fatal(err)
	}
	_, err = svc.Transition(ctx, eco, form.ID, formpayment.ActionECOAccept)
	assertConflict(t, err, "invoice document is required")
	_, err = svc.Transition(ctx, manager, form.ID, formpayment.ActionManagerFormAccept)
	assertConflict(t, err, "invoice document is required")

	stampInvoice(t, store, ctx, form.ID)
	accepted, err := svc.Transition(ctx, eco, form.ID, formpayment.ActionECOAccept)
	if err != nil {
		t.Fatal(err)
	}
	if accepted.Status != formpayment.StatusFormAccepted {
		t.Fatalf("status=%s", accepted.Status)
	}
}

func TestFirstConfirmCreatesOrgAgencyContractAndBlocksRepeatUpload(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	org, err := store.OrganizationByID(ctx, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	org.Status = domain.OrgApproved
	org.IsActive = true
	if err := store.SaveOrganization(ctx, org); err != nil {
		t.Fatal(err)
	}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "100", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	form.Status = formpayment.StatusContractVerification
	form.ContractID = ""
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}
	_, err = svc.Transition(ctx, manager, form.ID, formpayment.ActionManagerSendOrder)
	assertConflict(t, err, "contract file is required")

	stampDocs(t, store, ctx, form.ID, formpayment.DocFileRef{FileID: "contract-file", Kind: "contract", Label: "contract.pdf"})
	linked, err := svc.Transition(ctx, manager, form.ID, formpayment.ActionManagerSendOrder)
	if err != nil {
		t.Fatal(err)
	}
	if linked.Status != formpayment.StatusSigningOrder || linked.ContractID == "" {
		t.Fatalf("status=%s contract=%s", linked.Status, linked.ContractID)
	}
	saved, err := store.ContractByID(ctx, linked.ContractID)
	if err != nil {
		t.Fatal(err)
	}
	if saved.Status != domain.ContractStatusAccepted || saved.Type != domain.ContractTypeAgency || saved.OrganizationID != seed.OrgID {
		t.Fatalf("contract=%#v", saved)
	}

	waiting := linked
	waiting.Status = formpayment.StatusContractWaiting
	if err := store.SaveForm(ctx, waiting); err != nil {
		t.Fatal(err)
	}
	_, err = svc.Transition(ctx, user, form.ID, formpayment.ActionUserUploadContract)
	assertConflict(t, err, "organization already has an accepted agency contract")

	correction := waiting
	correction.Status = formpayment.StatusContractWaitingCorrection
	if err := store.SaveForm(ctx, correction); err != nil {
		t.Fatal(err)
	}
	stampDocs(t, store, ctx, form.ID, formpayment.DocFileRef{FileID: "contract-fix", Kind: "contract", Label: "fix.pdf"})
	fixed, err := svc.Transition(ctx, user, form.ID, formpayment.ActionUserUploadContract)
	if err != nil {
		t.Fatal(err)
	}
	if fixed.Status != formpayment.StatusContractVerification {
		t.Fatalf("correction status=%s", fixed.Status)
	}
}

func TestManagerSendOrderEnqueuesPOG(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	svc := service.NewFormPaymentService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "200", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	stampInvoice(t, store, ctx, form.ID)
	form, err = svc.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatal(err)
	}
	form, err = svc.Transition(ctx, user, form.ID, formpayment.ActionSubmit)
	if err != nil {
		t.Fatal(err)
	}
	org, err := store.OrganizationByID(ctx, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	org.Status = domain.OrgApproved
	org.IsActive = true
	if err := store.SaveOrganization(ctx, org); err != nil {
		t.Fatal(err)
	}
	form.Status = formpayment.StatusFormAccepted
	form.ContractID = "existing-contract"
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}

	linked, err := svc.Transition(ctx, manager, form.ID, formpayment.ActionManagerSendOrder)
	if err != nil {
		t.Fatal(err)
	}
	if linked.Status != formpayment.StatusSigningOrder {
		t.Fatalf("status=%s", linked.Status)
	}
	linked.UnpackDocsJSON()
	if linked.POGStatus != service.POGPending {
		t.Fatalf("pog_status=%s", linked.POGStatus)
	}
	pending, _ := box.Pending(ctx, 20)
	found := false
	for _, e := range pending {
		if e.EventType == events.TypeDocsGenerate {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("docs.generate not enqueued after manager_send_order")
	}
}

func TestExecutionProvidersAreNarrowAndRoleGated(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	svc := service.NewAccountService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	_, err := svc.ListExecutionProviders(ctx, user)
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != apperrors.ErrCodeForbidden {
		t.Fatalf("user list: %v", err)
	}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	rows, err := svc.ListExecutionProviders(ctx, manager)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].ID != seed.ProviderID || rows[0].Name != "Provider Seed" {
		t.Fatalf("rows=%#v", rows)
	}
}

func assertConflict(t *testing.T, err error, message string) {
	t.Helper()
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != apperrors.ErrCodeConflict || appErr.Message != message {
		t.Fatalf("want conflict %q got %v", message, err)
	}
}
