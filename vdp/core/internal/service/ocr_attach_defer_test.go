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
	"github.com/viletech/vdp/shared/events"
)

func TestCreateDefersOCRUntilFirstAttach(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, seqID())
	catalog := service.NewCatalogService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 20)
	for _, e := range pending {
		if e.EventType == events.TypeOCRRequested {
			t.Fatal("OCR must not enqueue on create before attach")
		}
	}

	meta, err := catalog.UploadFile(ctx, user, form.ID, "invoice.pdf", "application/pdf", "%PDF-1.4")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := catalog.AttachFileToForm(ctx, user, form.ID, meta.ID, "invoice", "invoice.pdf"); err != nil {
		t.Fatal(err)
	}
	pending, _ = box.Pending(ctx, 20)
	var ocrCount int
	for _, e := range pending {
		if e.EventType == events.TypeOCRRequested {
			ocrCount++
		}
	}
	if ocrCount != 1 {
		t.Fatalf("want 1 OCR after first attach, got %d", ocrCount)
	}

	meta2, err := catalog.UploadFile(ctx, user, form.ID, "contract.pdf", "application/pdf", "%PDF-1.4")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := catalog.AttachFileToForm(ctx, user, form.ID, meta2.ID, "contract", "contract.pdf"); err != nil {
		t.Fatal(err)
	}
	pending, _ = box.Pending(ctx, 20)
	ocrCount = 0
	for _, e := range pending {
		if e.EventType == events.TypeOCRRequested {
			ocrCount++
		}
	}
	if ocrCount != 1 {
		t.Fatalf("second attach must not duplicate OCR, got %d", ocrCount)
	}
}
