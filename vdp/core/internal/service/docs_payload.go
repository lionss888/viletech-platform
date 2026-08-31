package service

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// buildDocsGeneratePayload assembles hub/docs.generate business fields (template per PA, form context).
func (s *FormPaymentService) buildDocsGeneratePayload(ctx context.Context, form formpayment.Form, kind string) map[string]any {
	out := map[string]any{
		"kind":              kind,
		"direction":         string(form.Direction),
		"form_payment_id":   form.ID,
		"order_number":      form.ID,
		"organization_id":   form.OrganizationID,
		"agent_id":          form.AgentID,
		"contract_id":       form.ContractID,
		"contract_number":   form.ContractNumber,
		"contract_date":     form.ContractDate,
		"invoice_amount":    form.InvoiceAmount,
		"currency":          form.Currency,
		"counterparty_id":   form.CounterpartyID,
		"payment_method":    form.PaymentMethod,
		"platform_postpay":  form.PlatformPostpayMode,
		"rate_value":        form.Rate.Value,
		"rate_currency":     form.Rate.Currency,
		"fee_amount":        form.Commission.FeeAmount,
		"fee_percent":       form.Commission.FeePercent,
		"fee_currency":      form.Commission.FeeCurrency,
		"payment_purpose":   resolvePaymentPurpose(form),
		"document_date":     time.Now().UTC().Format("2006-01-02"),
		"actual_payment_amount": form.ActualPaymentAmount,
		"actual_payment_date":   form.ActualPaymentDate,
		"rub_equivalent":        computeRUBEquivalent(form),
	}
	s.mergeOrganizationPayload(ctx, out, form.OrganizationID)
	s.mergeAgentPayload(ctx, out, form.AgentID)
	s.mergeCounterpartyPayload(ctx, out, form.CounterpartyID)
	if form.AgentID != "" {
		templates, err := s.store.ListContractTemplatesByAgent(ctx, form.AgentID)
		if err == nil && len(templates) > 0 {
			tpl := templates[0]
			out["template_id"] = tpl.ID
			out["template_file_id"] = tpl.FileID
			out["template_type"] = string(tpl.Type)
		}
	}
	return out
}

func (s *FormPaymentService) mergeOrganizationPayload(ctx context.Context, out map[string]any, orgID string) {
	if orgID == "" {
		return
	}
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return
	}
	out["organization_inn"] = org.INN
	out["organization_name"] = org.Name
	out["organization_full_name"] = org.FullName
	out["organization_business_form"] = string(org.BusinessForm)
	out["organization_phone"] = org.Phone
	out["organization_email"] = org.Email
	out["organization_signer_name"] = org.SignerName
	out["organization_signer_position"] = string(org.SignerPosition)
	out["organization_signer_other_position"] = org.SignerOtherPosition
	out["organization_legal_address"] = org.LegalAddress
	out["organization_card_file_id"] = org.OrganizationCardFileID
	if org.DefaultAgentID != "" && out["agent_id"] == "" {
		out["agent_id"] = org.DefaultAgentID
	}
}

func (s *FormPaymentService) mergeAgentPayload(ctx context.Context, out map[string]any, agentID string) {
	if agentID == "" {
		return
	}
	agent, err := s.store.AgentByID(ctx, agentID)
	if err != nil {
		return
	}
	out["agent_name"] = agent.Name
	out["agent_inn"] = agent.INN
	out["agent_signature_file_id"] = agent.SignID
	out["agent_stamp_file_id"] = agent.StampID
}

func (s *FormPaymentService) mergeCounterpartyPayload(ctx context.Context, out map[string]any, cpID string) {
	if cpID == "" {
		return
	}
	cp, err := s.store.CounterpartyByID(ctx, cpID)
	if err != nil {
		return
	}
	out["counterparty_name"] = cp.Name
	out["counterparty_inn"] = cp.INN
	out["counterparty_country"] = cp.Country
	var banks []CounterpartyBank
	if cp.Banks != "" && cp.Banks != "[]" {
		_ = json.Unmarshal([]byte(cp.Banks), &banks)
	}
	out["counterparty_banks"] = banks
}

func resolvePaymentPurpose(form formpayment.Form) string {
	if form.PaymentPurpose != "" {
		return form.PaymentPurpose
	}
	if form.InvoiceJSON != "" {
		var inv map[string]any
		if json.Unmarshal([]byte(form.InvoiceJSON), &inv) == nil {
			if p, ok := inv["payment_purpose"].(string); ok && p != "" {
				return p
			}
			if p, ok := inv["purpose"].(string); ok && p != "" {
				return p
			}
		}
	}
	parts := make([]string, 0, 3)
	if form.ContractNumber != "" {
		parts = append(parts, "contract "+form.ContractNumber)
	}
	if form.InvoiceAmount != "" && form.Currency != "" {
		parts = append(parts, "payment "+form.InvoiceAmount+" "+form.Currency)
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "; ")
}

// computeRUBEquivalent is a provisional calc until D5 workshop (amount * rate when both parse).
func computeRUBEquivalent(form formpayment.Form) string {
	amount, err1 := strconv.ParseFloat(strings.ReplaceAll(form.InvoiceAmount, ",", "."), 64)
	rate, err2 := strconv.ParseFloat(strings.ReplaceAll(form.Rate.Value, ",", "."), 64)
	if err1 != nil || err2 != nil || amount == 0 || rate == 0 {
		return ""
	}
	return strconv.FormatFloat(amount*rate, 'f', 2, 64)
}
