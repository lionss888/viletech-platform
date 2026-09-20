package formpayment

import (
	"time"

	"github.com/viletech/vdp/core/internal/domain"
)

// ReturnEpisode tracks provider-initiated return after execution (новый контур).
// Не смешивается с пилотным refund (Phase 7): не использует FundsHeld/FundsRefunded.
// Источник: .cursor/plans/возврат_после_исполнения_d8d5706e.plan.md
type ReturnEpisode struct {
	// Active indicates one active return per form.
	Active bool `json:"active,omitempty"`

	// ReportedAmount is immutable, set by provider on report.
	ReportedAmount string `json:"reported_amount,omitempty"`

	// ReportedCurrency is immutable, set by provider on report.
	ReportedCurrency string `json:"reported_currency,omitempty"`

	// Reason is optional explanation from provider.
	Reason string `json:"reason,omitempty"`

	// ReportedBy is provider user_id who reported.
	ReportedBy string `json:"reported_by,omitempty"`

	// ReportedAt is timestamp when provider reported.
	ReportedAt time.Time `json:"reported_at,omitempty"`

	// Stage 2: Clarify cycle (manager → client → manager)
	// ClarifyQuestion is manager's question to client.
	ClarifyQuestion string `json:"clarify_question,omitempty"`

	// ClarifyFileID is optional document attached to question.
	ClarifyFileID string `json:"clarify_file_id,omitempty"`

	// ClarifyAskedAt is timestamp when manager asked.
	ClarifyAskedAt time.Time `json:"clarify_asked_at,omitempty"`

	// ClarifyAskedBy is manager user_id who asked.
	ClarifyAskedBy string `json:"clarify_asked_by,omitempty"`

	// ClarifyAnswer is client's answer.
	ClarifyAnswer string `json:"clarify_answer,omitempty"`

	// ClarifyAnswerFileID is optional document attached to answer.
	ClarifyAnswerFileID string `json:"clarify_answer_file_id,omitempty"`

	// ClarifyAnsweredAt is timestamp when client answered.
	ClarifyAnsweredAt time.Time `json:"clarify_answered_at,omitempty"`

	// ClarifyAnsweredBy is client user_id who answered.
	ClarifyAnsweredBy string `json:"clarify_answered_by,omitempty"`

	// ClarifyCycleCount tracks number of clarify rounds.
	ClarifyCycleCount int `json:"clarify_cycle_count,omitempty"`

	// Stage 3: Return to client (rate → consent/refuse → execute)
	// ToClientRate is current exchange rate set by manager (string, not float).
	ToClientRate string `json:"to_client_rate,omitempty"`

	// ToClientRateHistory tracks all rate changes.
	ToClientRateHistory []RateHistoryEntry `json:"to_client_rate_history,omitempty"`

	// ToClientRateSetAt is timestamp when current rate was set.
	ToClientRateSetAt time.Time `json:"to_client_rate_set_at,omitempty"`

	// ToClientRateSetBy is manager user_id who set current rate.
	ToClientRateSetBy string `json:"to_client_rate_set_by,omitempty"`

	// ClientConsentFileID is client's consent letter (required for execution).
	ClientConsentFileID string `json:"client_consent_file_id,omitempty"`

	// ClientConsentGivenAt is timestamp when consent was given.
	ClientConsentGivenAt time.Time `json:"client_consent_given_at,omitempty"`

	// ClientConsentGivenBy is client user_id who gave consent.
	ClientConsentGivenBy string `json:"client_consent_given_by,omitempty"`

	// ClientRefusalReason is client's refusal reason (if refused).
	ClientRefusalReason string `json:"client_refusal_reason,omitempty"`

	// ClientRefusedAt is timestamp when client refused.
	ClientRefusedAt time.Time `json:"client_refused_at,omitempty"`

	// ToClientRubPaymentFileID is manager's RUB payment file.
	ToClientRubPaymentFileID string `json:"to_client_rub_payment_file_id,omitempty"`

	// ToClientExecutedAt is timestamp when manager executed payment.
	ToClientExecutedAt time.Time `json:"to_client_executed_at,omitempty"`

	// ToClientExecutedBy is manager user_id who executed payment.
	ToClientExecutedBy string `json:"to_client_executed_by,omitempty"`

	// ToClientClosed marks episode as closed after RUB payment.
	ToClientClosed bool `json:"to_client_closed,omitempty"`

	// Stage 4: Repeat payment (manager → provider re-execution)
	// RepeatComment is manager's mandatory comment (client cannot see).
	RepeatComment string `json:"repeat_comment,omitempty"`

	// RepeatInitiatedAt is timestamp when manager initiated repeat.
	RepeatInitiatedAt time.Time `json:"repeat_initiated_at,omitempty"`

	// RepeatInitiatedBy is manager user_id who initiated repeat.
	RepeatInitiatedBy string `json:"repeat_initiated_by,omitempty"`

	// RepeatProviderOrgChanged marks if provider organization changed.
	RepeatProviderOrgChanged bool `json:"repeat_provider_org_changed,omitempty"`

	// RepeatNewProviderOrgID is new provider organization ID (if changed).
	RepeatNewProviderOrgID string `json:"repeat_new_provider_org_id,omitempty"`

	// RepeatNewAccountID is new provider account ID (if changed).
	RepeatNewAccountID string `json:"repeat_new_account_id,omitempty"`

	// RepeatExecutedAt is timestamp when provider executed repeat payment.
	RepeatExecutedAt time.Time `json:"repeat_executed_at,omitempty"`

	// RepeatExecutedBy is provider user_id who executed repeat.
	RepeatExecutedBy string `json:"repeat_executed_by,omitempty"`

	// RepeatPaymentFileID is new payment file from provider.
	RepeatPaymentFileID string `json:"repeat_payment_file_id,omitempty"`

	// RepeatClosed marks episode as closed after repeat execution.
	RepeatClosed bool `json:"repeat_closed,omitempty"`
}

// VisibleTo hides fields the role must not see.
// Client does not see the manager repeat comment.
// Provider does not see the client consent letter or the clarify dialogue.
func (e ReturnEpisode) VisibleTo(role domain.Role) ReturnEpisode {
	out := e
	switch role {
	case domain.RoleUser:
		out.RepeatComment = ""
	case domain.RoleProvider, domain.RoleSeniorProvider:
		out.ClientConsentFileID = ""
		out.ClarifyQuestion = ""
		out.ClarifyFileID = ""
		out.ClarifyAnswer = ""
		out.ClarifyAnswerFileID = ""
		out.ClientRefusalReason = ""
	}
	return out
}

// RateHistoryEntry records one rate change.
type RateHistoryEntry struct {
	Rate  string    `json:"rate"`
	SetAt time.Time `json:"set_at"`
	SetBy string    `json:"set_by"`
}
