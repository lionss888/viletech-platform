package service_test

import (
	"context"
	"encoding/base64"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/events"
)

func TestOCRPayloadIncludesContentBase64OnFirstAttach(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	catalog := service.NewCatalogService(store, box, seqID())
	forms := service.NewFormPaymentService(store, box, seqID()).WithBlobStore(catalog.Blobs())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	pdf := []byte("%PDF-1.4 invoice body for OCR")
	meta, err := catalog.UploadFileBytes(ctx, user, form.ID, "application/pdf", pdf)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := catalog.AttachFileToForm(ctx, user, form.ID, meta.ID, "invoice", "invoice.pdf"); err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 20)
	var found map[string]any
	for _, e := range pending {
		if e.EventType == events.TypeOCRRequested {
			found = e.Payload
			break
		}
	}
	if found == nil {
		t.Fatal("expected OCR event")
	}
	raw, _ := found["content_base64"].(string)
	if raw == "" {
		t.Fatalf("content_base64 missing: %#v", found)
	}
	decoded, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		t.Fatal(err)
	}
	if string(decoded) != string(pdf) {
		t.Fatalf("payload bytes mismatch got %q", decoded)
	}
	if found["file_name"] != "invoice.pdf" {
		t.Fatalf("file_name=%v", found["file_name"])
	}
	if found["mime"] != "application/pdf" {
		t.Fatalf("mime=%v", found["mime"])
	}
}

func TestStartExtractionIncludesContentBase64(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	catalog := service.NewCatalogService(store, box, seqID())
	forms := service.NewFormPaymentService(store, box, seqID()).WithBlobStore(catalog.Blobs())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := forms.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete); err != nil {
		t.Fatal(err)
	}
	form, err = store.FormByID(ctx, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	txt := []byte("Invoice INV-99 Amount 1500.00 USD Seller Acme")
	meta, err := catalog.UploadFileBytes(ctx, user, form.ID, "text/plain", txt)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := catalog.AttachFileToForm(ctx, user, form.ID, meta.ID, "invoice", "inv.txt"); err != nil {
		t.Fatal(err)
	}
	// Drain first_attach OCR if any (attach after draft still fires first_attach).
	pending, _ := box.Pending(ctx, 50)
	for _, e := range pending {
		_ = box.MarkPublished(ctx, e.ID)
	}
	if _, err := forms.StartExtraction(ctx, user, form.ID); err != nil {
		t.Fatal(err)
	}
	pending, _ = box.Pending(ctx, 20)
	var found map[string]any
	for _, e := range pending {
		if e.EventType == events.TypeOCRRequested {
			found = e.Payload
			break
		}
	}
	if found == nil {
		t.Fatal("expected OCR on start")
	}
	raw, _ := found["content_base64"].(string)
	decoded, err := base64.StdEncoding.DecodeString(raw)
	if err != nil || string(decoded) != string(txt) {
		t.Fatalf("bad content_base64: %v %q", err, decoded)
	}
	if found["kind"] != "manual_restart" {
		t.Fatalf("kind=%v", found["kind"])
	}
}
