package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/core/pkg/logger"
)

// ApplyHubCallback applies hub results via SM Transition / field patch only.
// Hub never writes core DB; this is the sole status mutation path for integrations.
func (s *FormPaymentService) ApplyHubCallback(ctx context.Context, formID, action string, body map[string]any) (formpayment.Form, error) {
	ctx = logger.WithFormPaymentID(ctx, formID)
	action = strings.TrimSpace(strings.ToLower(action))
	principal := authz.Principal{AccountID: "hub", Role: domain.RoleRoot}

	switch action {
	case "docs_generated", "docs.generate":
		return s.ApplyDocsGenerateResult(ctx, formID, body)
	case "ocr_recognized", "ocr.recognized":
		return s.ApplyOCRRecognized(ctx, principal, formID, body)
	case "diadoc_signed", "diadoc.signed":
		return s.ApplyDiadocSigned(ctx, principal, formID, body)
	case "onec_cover", "onec_fee", "onec_result":
		return s.ApplyOneCResult(ctx, principal, formID, action, body)
	default:
		if action == "" {
			return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "action required")
		}
		return s.Transition(ctx, principal, formID, formpayment.Action(action))
	}
}

// ApplyOCRRecognized patches draft fields from OCR; may Transition recognize_complete only.
// Never auto-pays or jumps payment statuses.
func (s *FormPaymentService) ApplyOCRRecognized(ctx context.Context, principal authz.Principal, formID string, body map[string]any) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	fields, _ := body["fields"].(map[string]any)
	applyField := func(key string, set func(string)) {
		if v, ok := body[key].(string); ok && v != "" {
			set(v)
			return
		}
		if fields != nil {
			if v, ok := fields[key].(string); ok && v != "" {
				set(v)
			}
		}
	}
	applyField("contract_number", func(v string) { form.ContractNumber = v })
	applyField("contract_date", func(v string) { form.ContractDate = v })
	applyField("invoice_amount", func(v string) { form.InvoiceAmount = v })
	applyField("currency", func(v string) { form.Currency = v })
	applyField("invoice_json", func(v string) { form.InvoiceJSON = v })
	if form.InvoiceJSON == "" && fields != nil {
		raw, _ := json.Marshal(fields)
		form.InvoiceJSON = string(raw)
	}
	form.UpdatedAt = time.Now().UTC()
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
		FromStatus: form.Status, ToStatus: form.Status,
		Comment: "ocr_recognized", CreatedAt: time.Now().UTC(),
	})
	if form.Status == formpayment.StatusCreating {
		return s.Transition(ctx, principal, formID, formpayment.ActionRecognizeComplete)
	}
	logger.FromContext(ctx, nil).Info("ocr fields applied without status change", "status", form.Status)
	return form, nil
}

// ApplyDiadocSigned advances SM only via Transition (report/order diadoc branch).
func (s *FormPaymentService) ApplyDiadocSigned(ctx context.Context, principal authz.Principal, formID string, body map[string]any) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	var action formpayment.Action
	switch form.Status {
	case formpayment.StatusReportWaitingDiadoc:
		action = formpayment.ActionReportUpload
	case formpayment.StatusSigningOrder, formpayment.StatusAdvanceSigningOrder:
		// Signed order uploaded → waiting verification
		if form.Status == formpayment.StatusAdvanceSigningOrder {
			action = formpayment.ActionAdvanceUserUpload
		} else {
			action = formpayment.ActionUserUploadOrder
		}
	default:
		// No SM advance — acknowledge without mutating status (degradation).
		logger.FromContext(ctx, nil).Info("diadoc signed ack without transition", "status", form.Status)
		_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
			ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
			FromStatus: form.Status, ToStatus: form.Status,
			Comment: "diadoc_signed_ack", CreatedAt: time.Now().UTC(),
		})
		return form, nil
	}
	return s.Transition(ctx, principal, formID, action)
}

// ApplyOneCResult stores cover/fee snapshot idempotently without payment auto-execution.
func (s *FormPaymentService) ApplyOneCResult(ctx context.Context, principal authz.Principal, formID, action string, body map[string]any) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	extID, _ := body["external_id"].(string)
	if extID == "" {
		extID, _ = body["event_id"].(string)
	}
	patch := map[string]any{"source": "1c", "action": action, "external_id": extID}
	if cover, ok := body["cover"].(string); ok && cover != "" {
		patch["cover"] = cover
		if form.InvoiceAmount == "" {
			form.InvoiceAmount = cover
		}
	}
	if fee, ok := body["fee"].(string); ok && fee != "" {
		patch["fee"] = fee
		form.Commission.FeeAmount = fee
		if form.Commission.FeeCurrency == "" {
			form.Commission.FeeCurrency = form.Currency
		}
	}
	raw, _ := json.Marshal(patch)
	// Merge into invoice_json marker for audit; do not change status.
	if form.InvoiceJSON == "" {
		form.InvoiceJSON = string(raw)
	} else {
		var cur map[string]any
		if json.Unmarshal([]byte(form.InvoiceJSON), &cur) == nil {
			cur["onec"] = patch
			merged, _ := json.Marshal(cur)
			form.InvoiceJSON = string(merged)
		}
	}
	form.UpdatedAt = time.Now().UTC()
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
		FromStatus: form.Status, ToStatus: form.Status,
		Comment: "onec:" + action + ":" + extID, CreatedAt: time.Now().UTC(),
	})
	logger.FromContext(ctx, nil).Info("1c result applied", "action", action, "external_id", extID, "status", form.Status)
	return form, nil
}
