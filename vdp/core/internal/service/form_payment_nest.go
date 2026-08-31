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
	"github.com/viletech/vdp/shared/events"
)

// TransitionByNestPath resolves Nest role+path to a domain action and applies SM.
func (s *FormPaymentService) TransitionByNestPath(ctx context.Context, principal authz.Principal, formID, rolePrefix, pathSuffix string) (formpayment.Form, error) {
	action, ok := formpayment.NestPathAction(rolePrefix, pathSuffix)
	if !ok {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "unknown nest path action")
	}
	return s.Transition(ctx, principal, formID, action)
}

// ApplyNestMeta handles Nest meta paths (important, generate, diadoc enqueue) without status change when possible.
func (s *FormPaymentService) ApplyNestMeta(ctx context.Context, principal authz.Principal, formID, rolePrefix, pathSuffix string) (formpayment.Form, error) {
	kind, ok := formpayment.NestMetaPath(rolePrefix, pathSuffix)
	if !ok {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "unknown nest meta path")
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	switch kind {
	case formpayment.MetaImportantOn:
		return s.SetImportant(ctx, principal, formID, true)
	case formpayment.MetaImportantOff:
		return s.SetImportant(ctx, principal, formID, false)
	case formpayment.MetaOrderGenerate:
		if err := s.RequestPaymentOrderGeneration(ctx, principal, formID, pogKindForDirection(form.Direction)); err != nil {
			return formpayment.Form{}, err
		}
		return s.GetUnpacked(ctx, principal, formID)
	case formpayment.MetaReportGenerate:
		if err := s.RequestPaymentOrderGeneration(ctx, principal, formID, "agent_report"); err != nil {
			return formpayment.Form{}, err
		}
		return s.GetUnpacked(ctx, principal, formID)
	case formpayment.MetaReportDiadoc:
		return s.Transition(ctx, principal, formID, formpayment.ActionReportDiadoc)
	case formpayment.MetaOrderDiadoc:
		_ = s.enqueue(ctx, form, events.TypeDiadocSignRequested, map[string]any{"kind": "payment_order"})
		return form, nil
	case formpayment.MetaAnalyzeCounterparty:
		_ = s.enqueue(ctx, form, events.TypeOCRRequested, map[string]any{"kind": "counterparty_analyze"})
		return form, nil
	case formpayment.MetaPayments, formpayment.MetaAdditional:
		return form, nil
	default:
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "unsupported nest meta")
	}
}

type NestPatchInput struct {
	RateValue           string `json:"rate_value"`
	RateCurrency        string `json:"rate_currency"`
	InvoiceAmount       string `json:"invoice_amount"`
	Currency            string `json:"currency"`
	ContractNumber      string `json:"contract_number"`
	ContractDate        string `json:"contract_date"`
	PaymentMethod       string `json:"payment_method"`
	PlatformPostpayMode string `json:"platform_postpay_mode"`
	SignMethod          string `json:"sign_method"`
	RateOnProvider      *bool  `json:"rate_on_provider"`
	InvoiceJSON         string `json:"invoice_json"`
	DocsJSON            string `json:"docs_json"`
	ProviderID          string `json:"provider_id"`
	AgentID             string `json:"agent_id"`
	Important           *bool  `json:"important"`
}

func (s *FormPaymentService) PatchForm(ctx context.Context, principal authz.Principal, formID string, input NestPatchInput) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	switch principal.Role {
	case domain.RoleUser:
		if form.AccountID != principal.AccountID {
			return formpayment.Form{}, apperrors.New(apperrors.ErrCodeForbidden, "forbidden")
		}
	case domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleProvider, domain.RoleSeniorProvider:
		// ok
	default:
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeForbidden, "role cannot patch form")
	}
	if input.InvoiceAmount != "" {
		form.InvoiceAmount = input.InvoiceAmount
	}
	if input.Currency != "" {
		form.Currency = input.Currency
	}
	if input.ContractNumber != "" {
		form.ContractNumber = input.ContractNumber
	}
	if input.ContractDate != "" {
		form.ContractDate = input.ContractDate
	}
	if input.PaymentMethod != "" {
		form.PaymentMethod = input.PaymentMethod
	}
	if input.PlatformPostpayMode != "" {
		form.PlatformPostpayMode = input.PlatformPostpayMode
		form.RateOnProvider = input.PlatformPostpayMode == formpayment.PostpayRateOnProvider
	}
	if input.SignMethod != "" {
		form.SignMethod = input.SignMethod
	}
	if input.RateOnProvider != nil {
		form.RateOnProvider = *input.RateOnProvider
	}
	if input.InvoiceJSON != "" {
		form.InvoiceJSON = input.InvoiceJSON
	}
	if input.DocsJSON != "" {
		form.DocsJSON = input.DocsJSON
	}
	if input.ProviderID != "" && (principal.Role == domain.RoleManager || principal.Role == domain.RoleRoot) {
		form.ProviderID = input.ProviderID
	}
	if input.AgentID != "" && (principal.Role == domain.RoleManager || principal.Role == domain.RoleRoot) {
		form.AgentID = input.AgentID
	}
	if input.Important != nil && (principal.Role == domain.RoleManager || principal.Role == domain.RoleProvider || principal.Role == domain.RoleRoot) {
		form.Important = *input.Important
	}
	if input.RateValue != "" {
		form.Rate = formpayment.Rate{Value: input.RateValue, Currency: input.RateCurrency, Source: "manual"}
		if form.Rate.Currency == "" {
			form.Rate.Currency = form.Currency
		}
	}
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) UpsertInvoice(ctx context.Context, principal authz.Principal, formID, uuid string, payload map[string]any) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	invoices := decodeInvoices(form.InvoiceJSON)
	if uuid == "" {
		uuid = s.newID()
		payload["uuid"] = uuid
		invoices = append(invoices, payload)
	} else {
		found := false
		for i, inv := range invoices {
			if str(inv["uuid"]) == uuid {
				payload["uuid"] = uuid
				invoices[i] = payload
				found = true
				break
			}
		}
		if !found {
			payload["uuid"] = uuid
			invoices = append(invoices, payload)
		}
	}
	raw, _ := json.Marshal(invoices)
	form.InvoiceJSON = string(raw)
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func (s *FormPaymentService) DeleteInvoice(ctx context.Context, principal authz.Principal, formID, uuid string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	invoices := decodeInvoices(form.InvoiceJSON)
	next := make([]map[string]any, 0, len(invoices))
	for _, inv := range invoices {
		if str(inv["uuid"]) != uuid {
			next = append(next, inv)
		}
	}
	raw, _ := json.Marshal(next)
	form.InvoiceJSON = string(raw)
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func (s *FormPaymentService) CopyForm(ctx context.Context, principal authz.Principal, formID string) (formpayment.Form, error) {
	src, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	now := time.Now().UTC()
	copyForm := src
	copyForm.ID = s.newID()
	copyForm.Status = formpayment.StatusCreating
	copyForm.PrevStatus = ""
	copyForm.ProviderID = ""
	copyForm.Important = false
	copyForm.CreatedAt = now
	copyForm.UpdatedAt = now
	if err := s.store.SaveForm(ctx, copyForm); err != nil {
		return formpayment.Form{}, err
	}
	return copyForm, nil
}

func (s *FormPaymentService) ImportCreating(ctx context.Context, principal authz.Principal, rows []CreateInput) ([]formpayment.Form, error) {
	out := make([]formpayment.Form, 0, len(rows))
	for _, row := range rows {
		form, err := s.Create(ctx, principal, row)
		if err != nil {
			return nil, err
		}
		out = append(out, form)
	}
	return out, nil
}

func (s *FormPaymentService) Count(ctx context.Context, principal authz.Principal) int {
	return len(s.List(ctx, principal))
}

func (s *FormPaymentService) DeleteFileRef(ctx context.Context, principal authz.Principal, formID, fileID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if form.DocsJSON == "" {
		return form, nil
	}
	form.DocsJSON = strings.ReplaceAll(form.DocsJSON, fileID, "")
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func decodeInvoices(raw string) []map[string]any {
	if raw == "" {
		return nil
	}
	var out []map[string]any
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func str(v any) string {
	s, _ := v.(string)
	return s
}
