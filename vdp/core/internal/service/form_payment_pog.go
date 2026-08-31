package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/shared/events"
)

const (
	POGIdle    = "idle"
	POGPending = "pending"
	POGSuccess = "success"
	POGFailed  = "failed"
)

// RequestDocsGenerate enqueues async POG (idempotent if already success with file).
func (s *FormPaymentService) RequestDocsGenerate(ctx context.Context, principal authz.Principal, formID string) error {
	return s.RequestPaymentOrderGeneration(ctx, principal, formID, "payment_order")
}

// RequestPaymentOrderGeneration unifies GenerateDocs / POG / agent-report enqueue.
func (s *FormPaymentService) RequestPaymentOrderGeneration(ctx context.Context, principal authz.Principal, formID, kind string) error {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		return err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return err
	}
	form.UnpackDocsJSON()
	if kind == "" {
		kind = pogKindForDirection(form.Direction)
	}
	// Idempotent: already generated
	if form.POGStatus == POGSuccess && form.POGFileID != "" && form.POGKind == kind {
		return nil
	}
	if form.POGStatus == POGPending {
		return nil
	}
	form.POGStatus = POGPending
	form.POGKind = kind
	form.POGAttempts++
	form.PackDocsJSON()
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return err
	}
	payload := s.buildDocsGeneratePayload(ctx, form, kind)
	payload["attempt"] = form.POGAttempts
	payload["idempotent"] = form.ID + "|" + kind + "|" + fmt.Sprint(form.POGAttempts)
	return s.enqueue(ctx, form, events.TypeDocsGenerate, payload)
}

// ApplyDocsGenerateResult attaches hub docs.generate result without changing form status.
func (s *FormPaymentService) ApplyDocsGenerateResult(ctx context.Context, formID string, result map[string]any) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	storageKey, _ := result["storage_key"].(string)
	mime, _ := result["mime"].(string)
	if mime == "" {
		mime = "application/pdf"
	}
	status, _ := result["status"].(string)
	if storageKey == "" {
		storageKey = fmt.Sprintf("docs/%s/stub.pdf", formID)
	}
	// Idempotent: same storage already attached
	if form.POGStatus == POGSuccess && form.POGFileID != "" {
		refs := formpayment.ParseDocRefs(form.DocsJSON)
		for _, ref := range refs {
			if ref.FileID == form.POGFileID {
				return form, nil
			}
		}
	}
	content := []byte("%PDF-1.4\n% vdp generated " + storageKey + "\n")
	if raw, ok := result["content"].(string); ok && raw != "" {
		content = []byte(raw)
	}
	sum := sha256.Sum256(content)
	fileID := s.newID()
	ownerID := form.AccountID
	if ownerID == "" {
		ownerID = formID
	}
	meta := domain.FileMeta{
		ID: fileID, OwnerID: ownerID, FormID: formID, StorageKey: storageKey,
		ContentType: mime, ContentHash: hex.EncodeToString(sum[:]), CreatedAt: time.Now().UTC(),
	}
	if err := s.store.SaveFile(ctx, meta); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.SaveDocument(ctx, formpayment.Document{
		ID: s.newID(), FormPaymentID: formID, Type: form.POGKind, StorageKey: storageKey, ContentHash: meta.ContentHash,
	})
	refs := formpayment.ParseDocRefs(form.DocsJSON)
	refs = append(refs, formpayment.DocFileRef{FileID: fileID, Kind: form.POGKind, Label: storageKey})
	form.POGStatus = POGSuccess
	if status == "failed" {
		form.POGStatus = POGFailed
	}
	form.POGFileID = fileID
	form.DocsJSON = formpayment.EncodeDocRefs(refs, &formpayment.POGState{
		Status: form.POGStatus, FileID: fileID, Attempts: form.POGAttempts, Kind: form.POGKind,
	})
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	// Attach generated file meta to active order when present (form + order).
	if form.ActiveOrderID != "" && form.POGStatus == POGSuccess {
		if o, err := s.store.OrderByID(ctx, form.ActiveOrderID); err == nil {
			o.FileIDs = append(o.FileIDs, fileID)
			o.UpdatedAt = time.Now().UTC()
			_ = s.store.SaveOrder(ctx, o)
		}
	}
	return form, nil
}

// maybeAutoEnqueuePOG closes gap Should "авто-передача поручения" when rate is fixed and fee known.
func (s *FormPaymentService) maybeAutoEnqueuePOG(ctx context.Context, principal authz.Principal, form formpayment.Form) {
	if form.Rate.Value == "" || form.Rate.Value == "0" {
		return
	}
	if form.Commission.FeeAmount == "" && form.Commission.FeePercent == "" {
		return
	}
	switch form.Status {
	case formpayment.StatusFormAccepted, formpayment.StatusSigningOrder, formpayment.StatusSigningOrderAccepted:
		_ = s.RequestPaymentOrderGeneration(ctx, principal, form.ID, pogKindForDirection(form.Direction))
	}
}

func pogKindForDirection(dir formpayment.Direction) string {
	if dir == formpayment.DirectionExport {
		return "export_order"
	}
	return "import_order"
}

func (s *FormPaymentService) GetUnpacked(ctx context.Context, principal authz.Principal, formID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	return form, nil
}
