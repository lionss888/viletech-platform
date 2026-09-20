package formpayment

import (
	"time"

	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ValidateMgrReturnRepeat checks manager initiating payment repeat.
func (f *Form) ValidateMgrReturnRepeat(comment, newProviderOrgID, newAccountID string) error {
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "no active return episode")
	}

	if f.Status != StatusReturnMgrDecision {
		return apperrors.New(apperrors.ErrCodeConflict, "repeat can only be initiated from mgr_return_decision status")
	}

	if comment == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "comment is required for repeat")
	}

	// Note: Counterparty is NOT re-checked even if provider org changes
	return nil
}

// ApplyMgrReturnRepeat records manager's repeat initiation.
func (f *Form) ApplyMgrReturnRepeat(comment, newProviderOrgID, newAccountID, initiatedBy string) {
	now := time.Now()
	
	f.ReturnEpisode.RepeatComment = comment
	f.ReturnEpisode.RepeatInitiatedAt = now
	f.ReturnEpisode.RepeatInitiatedBy = initiatedBy

	// Record org/account change if provided
	if newProviderOrgID != "" {
		f.ReturnEpisode.RepeatProviderOrgChanged = true
		f.ReturnEpisode.RepeatNewProviderOrgID = newProviderOrgID
		f.ReturnEpisode.RepeatNewAccountID = newAccountID
	}
}

// ValidateProvReturnRepeatExecute checks provider executing repeat payment.
func (f *Form) ValidateProvReturnRepeatExecute(paymentFileID, providerOrgID string) error {
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "no active return episode")
	}

	if f.Status != StatusProvReturnRepeatExecuting {
		return apperrors.New(apperrors.ErrCodeConflict, "repeat execute can only happen from prov_return_repeat_executing status")
	}

	if paymentFileID == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "payment_file_id is required")
	}

	// Check provider is assigned (original or new if changed)
	expectedProviderID := f.ProviderID
	if f.ReturnEpisode.RepeatProviderOrgChanged && f.ReturnEpisode.RepeatNewProviderOrgID != "" {
		expectedProviderID = f.ReturnEpisode.RepeatNewProviderOrgID
	}

	if providerOrgID != expectedProviderID {
		return apperrors.New(apperrors.ErrCodeForbidden, "only assigned provider can execute repeat payment")
	}

	return nil
}

// ApplyProvReturnRepeatExecute records repeat payment execution and closes episode.
// Old payment file is preserved.
func (f *Form) ApplyProvReturnRepeatExecute(paymentFileID, executedBy string) {
	now := time.Now()
	
	// Old payment file is preserved (f.ProviderPaymentFileID remains)
	f.ReturnEpisode.RepeatPaymentFileID = paymentFileID
	f.ReturnEpisode.RepeatExecutedAt = now
	f.ReturnEpisode.RepeatExecutedBy = executedBy
	
	// Close episode
	f.ReturnEpisode.RepeatClosed = true
	f.ReturnEpisode.Active = false
}
