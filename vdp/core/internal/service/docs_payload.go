package service

import (
	"context"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// buildDocsGeneratePayload assembles hub/docs.generate business fields (template per PA, form context).
func (s *FormPaymentService) buildDocsGeneratePayload(ctx context.Context, form formpayment.Form, kind string) map[string]any {
	out := map[string]any{
		"kind":              kind,
		"direction":         string(form.Direction),
		"form_payment_id":   form.ID,
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
	}
	if form.AgentID != "" {
		templates, err := s.store.ListContractTemplatesByAgent(ctx, form.AgentID)
		if err == nil && len(templates) > 0 {
			tpl := templates[0]
			out["template_id"] = tpl.ID
			out["template_file_id"] = tpl.FileID
			out["template_type"] = string(tpl.Type)
		}
	}
	if org, err := s.store.OrganizationByID(ctx, form.OrganizationID); err == nil {
		out["organization_inn"] = org.INN
		out["organization_name"] = org.Name
		if org.DefaultAgentID != "" && out["agent_id"] == "" {
			out["agent_id"] = org.DefaultAgentID
		}
	}
	return out
}
