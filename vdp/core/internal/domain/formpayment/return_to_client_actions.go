package formpayment

import (
	"strconv"
	"time"

	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ValidateMgrReturnToClientRate checks manager setting exchange rate.
func (f *Form) ValidateMgrReturnToClientRate(rate string) error {
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "no active return episode")
	}

	// Can set rate from mgr_return_decision or after client refusal
	if f.Status != StatusReturnMgrDecision && f.Status != StatusClientReturnRefused {
		return apperrors.New(apperrors.ErrCodeConflict, "rate can only be set from mgr_return_decision or client_return_refused status")
	}

	if rate == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "rate cannot be empty")
	}

	// Validate decimal format (not float)
	if _, err := strconv.ParseFloat(rate, 64); err != nil {
		return apperrors.New(apperrors.ErrCodeValidation, "rate must be a valid decimal number")
	}

	return nil
}

// ApplyMgrReturnToClientRate records the rate and adds to history.
func (f *Form) ApplyMgrReturnToClientRate(rate, setBy string) {
	now := time.Now()
	
	// Update current rate
	f.ReturnEpisode.ToClientRate = rate
	f.ReturnEpisode.ToClientRateSetAt = now
	f.ReturnEpisode.ToClientRateSetBy = setBy

	// Add to history
	f.ReturnEpisode.ToClientRateHistory = append(f.ReturnEpisode.ToClientRateHistory, RateHistoryEntry{
		Rate:  rate,
		SetAt: now,
		SetBy: setBy,
	})

	// Clear previous client answer (new rate cycle)
	f.ReturnEpisode.ClientConsentFileID = ""
	f.ReturnEpisode.ClientConsentGivenAt = time.Time{}
	f.ReturnEpisode.ClientConsentGivenBy = ""
	f.ReturnEpisode.ClientRefusalReason = ""
	f.ReturnEpisode.ClientRefusedAt = time.Time{}
}

// ValidateClientReturnConsent checks client giving consent with letter.
func (f *Form) ValidateClientReturnConsent(consentFileID string) error {
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "no active return episode")
	}

	if f.Status != StatusClientReturnConsentPending {
		return apperrors.New(apperrors.ErrCodeConflict, "consent can only be given from client_return_consent_pending status")
	}

	if consentFileID == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "consent_file_id is required")
	}

	return nil
}

// ApplyClientReturnConsent records client consent letter.
func (f *Form) ApplyClientReturnConsent(consentFileID, givenBy string) {
	now := time.Now()
	
	f.ReturnEpisode.ClientConsentFileID = consentFileID
	f.ReturnEpisode.ClientConsentGivenAt = now
	f.ReturnEpisode.ClientConsentGivenBy = givenBy
}

// ValidateClientReturnRefuse checks client refusal with reason.
func (f *Form) ValidateClientReturnRefuse(reason string) error {
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "no active return episode")
	}

	if f.Status != StatusClientReturnConsentPending {
		return apperrors.New(apperrors.ErrCodeConflict, "refusal can only be given from client_return_consent_pending status")
	}

	if reason == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "reason is required")
	}

	return nil
}

// ApplyClientReturnRefuse records client refusal reason.
func (f *Form) ApplyClientReturnRefuse(reason, refusedBy string) {
	now := time.Now()
	
	f.ReturnEpisode.ClientRefusalReason = reason
	f.ReturnEpisode.ClientRefusedAt = now
	
	// Clear consent if any (though it should be cleared on new rate)
	f.ReturnEpisode.ClientConsentFileID = ""
	f.ReturnEpisode.ClientConsentGivenAt = time.Time{}
	f.ReturnEpisode.ClientConsentGivenBy = ""
}

// ValidateMgrReturnToClientExecute checks manager executing RUB payment.
// CRITICAL: Cannot execute without client consent letter.
func (f *Form) ValidateMgrReturnToClientExecute(rubPaymentFileID string) error {
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "no active return episode")
	}

	if f.Status != StatusMgrReturnToClientReadyExecute {
		return apperrors.New(apperrors.ErrCodeConflict, "execution can only happen from mgr_return_to_client_ready_execute status")
	}

	// CRITICAL GUARD: consent letter is mandatory
	if f.ReturnEpisode.ClientConsentFileID == "" {
		return apperrors.New(apperrors.ErrCodeConflict, "client consent letter is required for execution")
	}

	if rubPaymentFileID == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "rub_payment_file_id is required")
	}

	return nil
}

// ApplyMgrReturnToClientExecute records RUB payment and closes episode.
func (f *Form) ApplyMgrReturnToClientExecute(rubPaymentFileID, executedBy string) {
	now := time.Now()
	
	f.ReturnEpisode.ToClientRubPaymentFileID = rubPaymentFileID
	f.ReturnEpisode.ToClientExecutedAt = now
	f.ReturnEpisode.ToClientExecutedBy = executedBy
	
	// Close episode
	f.ReturnEpisode.ToClientClosed = true
	f.ReturnEpisode.Active = false
}
