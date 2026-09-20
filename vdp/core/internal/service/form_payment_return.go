package service

import (
	"context"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// ProvReturnReport allows provider to report return after payment execution (stage 1).
// Guards:
// - only import
// - only after execution (payment_sent and later)
// - one active episode
// - provider assigned and is actor
// - amount required
func (s *FormPaymentService) ProvReturnReport(ctx context.Context, principal authz.Principal, formID, amount, currency, reason string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate return report guards
	if err := form.ValidateProvReturnReport(amount, currency, reason, principal.Role, principal.OrganizationID, principal.AccountID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply return episode activation (idempotent)
	form.ApplyProvReturnReport(amount, currency, reason, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// MgrReturnClarify allows manager to ask client for clarification (stage 2).
// Guards:
// - episode active
// - only manager
// - question required
// - status allows clarify (return_reported or return_mgr_decision)
func (s *FormPaymentService) MgrReturnClarify(ctx context.Context, principal authz.Principal, formID, question, fileID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate clarify guards
	if err := form.ValidateMgrReturnClarify(question, fileID, principal.Role, principal.AccountID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply manager clarification (idempotent)
	form.ApplyMgrReturnClarify(question, fileID, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// ClientReturnClarifyReply allows client to reply to manager's clarification question (stage 2).
// Guards:
// - episode active
// - only client (form owner)
// - answer required
// - status = return_awaiting_client_clarify
// - manager asked question
func (s *FormPaymentService) ClientReturnClarifyReply(ctx context.Context, principal authz.Principal, formID, answer, fileID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate reply guards
	if err := form.ValidateClientReturnClarifyReply(answer, fileID, principal.Role, principal.AccountID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply client reply (idempotent)
	form.ApplyClientReturnClarifyReply(answer, fileID, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// MgrReturnToClientRate allows manager to set exchange rate for return to client (stage 3).
// Guards:
// - episode active
// - only manager
// - rate required and valid decimal
// - status = return_mgr_decision or client_return_refused
func (s *FormPaymentService) MgrReturnToClientRate(ctx context.Context, principal authz.Principal, formID, rate string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate rate guards
	if err := form.ValidateMgrReturnToClientRate(rate); err != nil {
		return formpayment.Form{}, err
	}

	// Apply manager rate (idempotent with new timestamp)
	form.ApplyMgrReturnToClientRate(rate, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// ClientReturnConsent allows client to give consent with letter (stage 3).
// Guards:
// - episode active
// - only client (form owner)
// - consent_file_id required
// - status = client_return_consent_pending
func (s *FormPaymentService) ClientReturnConsent(ctx context.Context, principal authz.Principal, formID, consentFileID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate consent guards
	if err := form.ValidateClientReturnConsent(consentFileID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply client consent
	form.ApplyClientReturnConsent(consentFileID, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// ClientReturnRefuse allows client to refuse rate with reason (stage 3).
// Guards:
// - episode active
// - only client (form owner)
// - reason required
// - status = client_return_consent_pending
func (s *FormPaymentService) ClientReturnRefuse(ctx context.Context, principal authz.Principal, formID, reason string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate refusal guards
	if err := form.ValidateClientReturnRefuse(reason); err != nil {
		return formpayment.Form{}, err
	}

	// Apply client refusal
	form.ApplyClientReturnRefuse(reason, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// MgrReturnToClientExecute allows manager to execute RUB payment (stage 3).
// CRITICAL Guards:
// - episode active
// - only manager
// - rub_payment_file_id required
// - status = mgr_return_to_client_ready_execute
// - client consent letter MUST exist
func (s *FormPaymentService) MgrReturnToClientExecute(ctx context.Context, principal authz.Principal, formID, rubPaymentFileID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate execution guards (includes CRITICAL consent check)
	if err := form.ValidateMgrReturnToClientExecute(rubPaymentFileID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply manager execution (closes episode)
	form.ApplyMgrReturnToClientExecute(rubPaymentFileID, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// MgrReturnRepeat allows manager to initiate payment repeat (stage 4).
// Guards:
// - episode active
// - only manager
// - comment required
// - status = return_mgr_decision
// - counterparty NOT re-checked
func (s *FormPaymentService) MgrReturnRepeat(ctx context.Context, principal authz.Principal, formID, comment, newProviderOrgID, newAccountID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate repeat guards
	if err := form.ValidateMgrReturnRepeat(comment, newProviderOrgID, newAccountID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply manager repeat initiation
	form.ApplyMgrReturnRepeat(comment, newProviderOrgID, newAccountID, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}

// ProvReturnRepeatExecute allows provider to execute repeat payment (stage 4).
// Guards:
// - episode active
// - only assigned provider (original or new if changed)
// - payment_file_id required
// - status = prov_return_repeat_executing
// - old payment file preserved
func (s *FormPaymentService) ProvReturnRepeatExecute(ctx context.Context, principal authz.Principal, formID, paymentFileID string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()

	// Validate execution guards
	if err := form.ValidateProvReturnRepeatExecute(paymentFileID, principal.OrganizationID); err != nil {
		return formpayment.Form{}, err
	}

	// Apply provider repeat execution (closes episode)
	form.ApplyProvReturnRepeatExecute(paymentFileID, principal.AccountID)

	// Save form
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}

	form.UnpackDocsJSON()
	return form, nil
}
