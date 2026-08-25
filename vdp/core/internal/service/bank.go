package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/shared/events"
)

// BankSettingsInput is admin configuration for ClientType Bank (§5.3).
type BankSettingsInput struct {
	ClientType                 domain.ClientType `json:"client_type"`
	BankFixedCommissionPercent string            `json:"bank_fixed_commission_percent"`
	ApplyPlatformMarkup        bool              `json:"apply_platform_markup"`
	DefaultAgentID             string            `json:"default_agent_id"`
	BankWebhookURL             string            `json:"bank_webhook_url"`
	BankWebhookSecret          string            `json:"bank_webhook_secret"`
}

// BankCreateInput is the bank channel create/update payload.
type BankCreateInput struct {
	IdempotencyKey string
	OrganizationID string
	CounterpartyID string
	Amount         string
	Currency       string
	Direction      formpayment.Direction
	Kind           formpayment.Kind
	ContractNumber string
	ContractDate   string
	FileRefs       []formpayment.DocFileRef
	CorrelationID  string
	Purpose        string
}

// BankFormResponse is returned to the bank technical client.
type BankFormResponse struct {
	ID            string            `json:"id"`
	Status        string            `json:"status"`
	Channel       string            `json:"channel"`
	CorrelationID string            `json:"correlation_id"`
	DeepLink      string            `json:"deep_link"`
	InvoiceAmount string            `json:"invoice_amount,omitempty"`
	Currency      string            `json:"currency,omitempty"`
	Commission    formpayment.Commission `json:"commission"`
	Rate          formpayment.Rate       `json:"rate"`
	AgentID       string            `json:"agent_id,omitempty"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

func (s *OrganizationService) SetBankSettings(ctx context.Context, principal authz.Principal, orgID string, in BankSettingsInput) (domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.Organization{}, err
	}
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return domain.Organization{}, err
	}
	if in.ClientType == "" {
		in.ClientType = domain.ClientTypeBank
	}
	if in.ClientType == domain.ClientTypeBank && in.BankFixedCommissionPercent == "" {
		return domain.Organization{}, apperrors.New(apperrors.ErrCodeValidation, "bank_fixed_commission_percent required for bank client")
	}
	org.ClientType = in.ClientType
	org.BankFixedCommissionPercent = in.BankFixedCommissionPercent
	org.ApplyPlatformMarkup = in.ApplyPlatformMarkup
	org.DefaultAgentID = in.DefaultAgentID
	org.BankWebhookURL = in.BankWebhookURL
	org.BankWebhookSecret = in.BankWebhookSecret
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *FormPaymentService) CreateOrGetBankForm(ctx context.Context, principal authz.Principal, in BankCreateInput) (BankFormResponse, bool, error) {
	if err := authz.RequireRoles(principal, domain.RoleBank); err != nil {
		return BankFormResponse{}, false, err
	}
	if in.IdempotencyKey == "" {
		return BankFormResponse{}, false, apperrors.New(apperrors.ErrCodeValidation, "Idempotency-Key required")
	}
	if in.OrganizationID == "" {
		in.OrganizationID = principal.OrganizationID
	}
	if in.OrganizationID == "" || in.OrganizationID != principal.OrganizationID {
		return BankFormResponse{}, false, apperrors.New(apperrors.ErrCodeForbidden, "bank client may only create forms for own organization")
	}
	if in.Amount == "" || in.Currency == "" {
		return BankFormResponse{}, false, apperrors.New(apperrors.ErrCodeValidation, "amount and currency required")
	}
	scope := principal.AccountID
	if existingID, err := s.store.FormIDByBankIdempotency(ctx, scope, in.IdempotencyKey); err == nil {
		form, err := s.store.FormByID(ctx, existingID)
		if err != nil {
			return BankFormResponse{}, false, err
		}
		form.UnpackDocsJSON()
		return toBankResponse(form), true, nil
	}

	org, err := s.store.OrganizationByID(ctx, in.OrganizationID)
	if err != nil {
		return BankFormResponse{}, false, err
	}
	if org.ClientType != domain.ClientTypeBank {
		return BankFormResponse{}, false, apperrors.New(apperrors.ErrCodeValidation, "organization is not ClientType bank")
	}
	if org.BankFixedCommissionPercent == "" {
		return BankFormResponse{}, false, apperrors.New(apperrors.ErrCodeValidation, "bank fixed commission not configured")
	}

	if in.Direction == "" {
		in.Direction = formpayment.DirectionImport
	}
	if in.Kind == "" {
		in.Kind = formpayment.KindGood
	}
	corr := in.CorrelationID
	if corr == "" {
		corr = s.newID()
	}
	now := time.Now().UTC()
	form := formpayment.Form{
		ID:             s.newID(),
		AccountID:      principal.AccountID,
		OrganizationID: in.OrganizationID,
		CounterpartyID: in.CounterpartyID,
		Status:         formpayment.StatusDraft,
		Direction:      in.Direction,
		Kind:           in.Kind,
		Channel:        formpayment.ChannelBank,
		CorrelationID:  corr,
		IdempotencyKey: in.IdempotencyKey,
		InvoiceAmount:  in.Amount,
		Currency:       in.Currency,
		ContractNumber: in.ContractNumber,
		ContractDate:   in.ContractDate,
		CreatedAt:      now,
		UpdatedAt:      now,
		Rate: formpayment.Rate{
			Value: "0", Currency: in.Currency,
			Source: bankRateSource(org.ApplyPlatformMarkup),
		},
	}
	comm, err := CalculateCommission(in.Amount, org.BankFixedCommissionPercent, in.Currency)
	if err != nil {
		return BankFormResponse{}, false, err
	}
	form.Commission = comm
	if len(in.FileRefs) > 0 {
		form.DocsJSON = formpayment.EncodeDocsBundle(formpayment.DocsBundle{Files: in.FileRefs})
	}
	if in.Purpose != "" {
		inv, _ := json.Marshal(map[string]any{"purpose": in.Purpose})
		form.InvoiceJSON = string(inv)
	}

	s.applyBankAutoskip(ctx, &form, org)
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return BankFormResponse{}, false, err
	}
	_ = s.store.SaveBankIdempotency(ctx, scope, in.IdempotencyKey, form.ID)

	// Mark account bank rate readonly when markup is disabled.
	if !org.ApplyPlatformMarkup {
		if acct, err := s.store.AccountByID(ctx, principal.AccountID); err == nil {
			acct.BankRateReadonly = true
			_ = s.store.SaveAccount(ctx, acct)
		}
	}

	payload := map[string]any{
		"from": "", "to": string(form.Status), "action": "bank_create", "channel": formpayment.ChannelBank,
		"correlation_id": form.CorrelationID,
	}
	_ = s.enqueue(ctx, form, events.TypeFormPaymentStatusChanged, payload)
	_ = s.enqueueBankWebhook(ctx, form, org, "status_changed", payload)
	if s.bus != nil {
		s.bus.Publish(form.ID, "status_changed", payload)
	}
	return toBankResponse(form), false, nil
}

func bankRateSource(applyMarkup bool) string {
	if applyMarkup {
		return "bank_with_markup"
	}
	return "bank_no_markup"
}

func (s *FormPaymentService) applyBankAutoskip(ctx context.Context, form *formpayment.Form, org domain.Organization) {
	if !org.IsClientActive() {
		form.Status = formpayment.StatusOrganizationWaitingVerification
		return
	}
	agentID := org.DefaultAgentID
	hasContract := false
	if agentID != "" {
		form.AgentID = agentID
		contracts, _ := s.store.ListContracts(ctx)
		for _, c := range contracts {
			if c.IsTemplate || c.AgentID != agentID || c.Status != domain.ContractStatusAccepted {
				continue
			}
			if c.OrganizationID != "" && c.OrganizationID != form.OrganizationID {
				continue
			}
			hasContract = true
			form.ContractID = c.ID
			break
		}
	}
	if agentID != "" && hasContract {
		form.Status = formpayment.StatusFormAccepted
		return
	}
	form.Status = formpayment.StatusFormWaitingVerification
}

func (s *FormPaymentService) GetBankForm(ctx context.Context, principal authz.Principal, formID string) (BankFormResponse, error) {
	if err := authz.RequireRoles(principal, domain.RoleBank); err != nil {
		return BankFormResponse{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return BankFormResponse{}, err
	}
	if form.Channel != formpayment.ChannelBank {
		return BankFormResponse{}, apperrors.ErrForbidden
	}
	return toBankResponse(form), nil
}

func (s *FormPaymentService) ListBankForms(ctx context.Context, principal authz.Principal) ([]BankFormResponse, error) {
	if err := authz.RequireRoles(principal, domain.RoleBank); err != nil {
		return nil, err
	}
	out := make([]BankFormResponse, 0)
	for _, f := range s.List(ctx, principal) {
		if f.Channel != formpayment.ChannelBank {
			continue
		}
		f.UnpackDocsJSON()
		out = append(out, toBankResponse(f))
	}
	return out, nil
}

func toBankResponse(form formpayment.Form) BankFormResponse {
	return BankFormResponse{
		ID: form.ID, Status: string(form.Status), Channel: form.Channel,
		CorrelationID: form.CorrelationID,
		DeepLink:      fmt.Sprintf("/bank/forms/%s?correlation_id=%s", form.ID, form.CorrelationID),
		InvoiceAmount: form.InvoiceAmount, Currency: form.Currency,
		Commission: form.Commission, Rate: form.Rate, AgentID: form.AgentID, UpdatedAt: form.UpdatedAt,
	}
}

func (s *FormPaymentService) enqueueBankWebhook(ctx context.Context, form formpayment.Form, org domain.Organization, eventType string, payload map[string]any) error {
	if org.BankWebhookURL == "" || s.box == nil {
		return nil
	}
	body := map[string]any{
		"event":           eventType,
		"form_payment_id": form.ID,
		"correlation_id":  form.CorrelationID,
		"status":          string(form.Status),
		"channel":         form.Channel,
		"payload":         payload,
		"at":              time.Now().UTC().Format(time.RFC3339),
	}
	raw, _ := json.Marshal(body)
	sig := signBankWebhook(org.BankWebhookSecret, raw)
	return s.box.Enqueue(ctx, outbox.Event{
		ID: s.newID(), AggregateID: form.ID, AggregateType: events.AggregateFormPayment,
		EventType: events.TypeBankWebhook, FormPaymentID: form.ID,
		Payload: map[string]any{
			"url":       org.BankWebhookURL,
			"secret":    org.BankWebhookSecret,
			"signature": sig,
			"body":      string(raw),
			"event":     eventType,
		},
		Status: "pending", MaxRetries: 5, CreatedAt: time.Now().UTC(),
	})
}

func signBankWebhook(secret string, body []byte) string {
	if secret == "" {
		return ""
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

// maybeEnqueueBankWebhook is called after normal transitions for bank-channel forms.
func (s *FormPaymentService) maybeEnqueueBankWebhook(ctx context.Context, form formpayment.Form, payload map[string]any) {
	if form.Channel != formpayment.ChannelBank {
		return
	}
	org, err := s.store.OrganizationByID(ctx, form.OrganizationID)
	if err != nil {
		return
	}
	eventType := "status_changed"
	to, _ := payload["to"].(string)
	if to == string(formpayment.StatusSigningOrder) || to == string(formpayment.StatusAdvanceSigningOrder) {
		eventType = "sign_request"
	}
	_ = s.enqueueBankWebhook(ctx, form, org, eventType, payload)
}
