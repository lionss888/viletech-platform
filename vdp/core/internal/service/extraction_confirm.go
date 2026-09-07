package service

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/shared/extraction"
)

func mergeExtractionResult(body, fields map[string]any) (extraction.Result, bool) {
	try := func(raw string) (extraction.Result, bool) {
		return extraction.ParseFromInvoiceJSON(raw)
	}
	if v, ok := body["invoice_json"].(string); ok && v != "" {
		if r, ok := try(v); ok {
			return r, true
		}
	}
	if fields != nil {
		if v, ok := fields["invoice_json"].(string); ok && v != "" {
			if r, ok := try(v); ok {
				return r, true
			}
		}
		raw, err := json.Marshal(fields)
		if err == nil {
			if r, err := extraction.ParseResult(raw); err == nil {
				return r, true
			}
		}
	}
	return extraction.Result{}, false
}

// ConfirmExtraction stores human-edited ExtractionResult and notifies gold store.
func (s *FormPaymentService) ConfirmExtraction(ctx context.Context, principal authz.Principal, formID string, human extraction.Result) (formpayment.Form, error) {
	if principal.Role == domain.RoleProvider || principal.Role == domain.RoleSeniorProvider {
		return formpayment.Form{}, apperrors.ErrForbidden
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if err := authz.CanAccessForm(principal, form); err != nil {
		return formpayment.Form{}, err
	}
	if human.SchemaVersion == "" {
		human.SchemaVersion = extraction.SchemaVersion
	}
	if human.Meta.EngineID == "" {
		human.Meta.EngineID = "human"
	}
	human.Meta.Confirmed = true
	human.Meta.FormPaymentID = formID
	human.Meta.ContentHash = extraction.ContentHash(human)
	if err := extraction.Validate(human); err != nil {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, err.Error())
	}
	form.UnpackDocsJSON()
	form.InvoiceJSON = extraction.ToInvoiceJSON(human)
	if human.Header.ContractNumber != "" {
		form.ContractNumber = human.Header.ContractNumber
	}
	if human.Header.ContractDate != "" {
		form.ContractDate = human.Header.ContractDate
	}
	if human.Header.InvoiceAmount != "" {
		form.InvoiceAmount = human.Header.InvoiceAmount
	}
	if human.Header.Currency != "" {
		form.Currency = human.Header.Currency
	}
	form.UpdatedAt = time.Now().UTC()
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
		FromStatus: form.Status, ToStatus: form.Status,
		Comment: "extraction_confirmed", CreatedAt: time.Now().UTC(),
	})
	go s.postGoldHuman(formID, human)
	return form, nil
}

func (s *FormPaymentService) postGoldHuman(formID string, human extraction.Result) {
	if s.extractionURL == "" {
		return
	}
	body, _ := json.Marshal(map[string]any{
		"form_payment_id": formID,
		"gold_id":         extraction.NewGoldID(formID, human.Meta.EventID),
		"human":           human,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.extractionURL+"/gold/human", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if s.hubSharedSecret != "" {
		req.Header.Set("X-Hub-Secret", s.hubSharedSecret)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return
	}
	_ = res.Body.Close()
}
