package formpayment

import (
	"strconv"
	"strings"

	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// RefundState tracks client funds return (§4 extension).
type RefundState struct {
	Amount          string `json:"amount,omitempty"`
	Currency        string `json:"currency,omitempty"`
	ReceivedAmount  string `json:"received_amount,omitempty"`
	ReceivedCurrency string `json:"received_currency,omitempty"`
	FileID          string `json:"file_id,omitempty"`
	InitiatedBy     string `json:"initiated_by,omitempty"`
	ConfirmedBy     string `json:"confirmed_by,omitempty"`
	FundsHeld       bool   `json:"funds_held,omitempty"`
	FundsRefunded   bool   `json:"funds_refunded,omitempty"`
}

// HasUnrefundedFunds is true when agent holds client money that was not returned.
func (f Form) HasUnrefundedFunds() bool {
	if f.FundsRefunded {
		return false
	}
	if f.FundsHeld {
		return true
	}
	// Status-based fallback when flag not yet packed (legacy forms).
	switch f.Status {
	case StatusPaymentReceived, StatusPaymentProcessing, StatusPaymentSent,
		StatusPaymentSentTreasurer, StatusManagerChecking,
		StatusPaymentRefundWaiting, StatusPaymentRefundProcessing:
		return true
	default:
		return false
	}
}

// MarkFundsReceived snapshots invoice as held funds (idempotent).
func (f *Form) MarkFundsReceived() {
	if f.FundsRefunded {
		return
	}
	f.FundsHeld = true
	if f.FundsReceivedAmount == "" {
		f.FundsReceivedAmount = f.InvoiceAmount
	}
	if f.FundsReceivedCurrency == "" {
		f.FundsReceivedCurrency = f.Currency
	}
}

// MarkFundsRefunded clears held flag after REFUND_SENT.
func (f *Form) MarkFundsRefunded(actorID string) {
	f.FundsHeld = false
	f.FundsRefunded = true
	if actorID != "" {
		f.RefundConfirmedBy = actorID
	}
}

// ValidateRefundAmount ensures refund amount/currency matches received funds.
func (f Form) ValidateRefundAmount(amount, currency string) error {
	recvAmt := f.FundsReceivedAmount
	if recvAmt == "" {
		recvAmt = f.InvoiceAmount
	}
	recvCur := strings.ToUpper(strings.TrimSpace(f.FundsReceivedCurrency))
	if recvCur == "" {
		recvCur = strings.ToUpper(strings.TrimSpace(f.Currency))
	}
	cur := strings.ToUpper(strings.TrimSpace(currency))
	if cur == "" {
		cur = recvCur
	}
	if recvCur != "" && cur != recvCur {
		return apperrors.New(apperrors.ErrCodeValidation, "refund currency must match received funds currency")
	}
	if amount == "" {
		amount = recvAmt
	}
	want, err1 := parseMoney(recvAmt)
	got, err2 := parseMoney(amount)
	if err1 != nil || err2 != nil {
		return apperrors.New(apperrors.ErrCodeValidation, "invalid refund amount")
	}
	if got <= 0 {
		return apperrors.New(apperrors.ErrCodeValidation, "refund amount must be positive")
	}
	// Allow exact match only for MVP (partial refund out of scope).
	if got != want {
		return apperrors.New(apperrors.ErrCodeValidation, "refund amount must equal received funds")
	}
	return nil
}

func parseMoney(s string) (float64, error) {
	s = strings.TrimSpace(strings.ReplaceAll(s, ",", "."))
	if s == "" {
		return 0, strconv.ErrSyntax
	}
	return strconv.ParseFloat(s, 64)
}
