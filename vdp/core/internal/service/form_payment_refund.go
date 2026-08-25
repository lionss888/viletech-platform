package service

import (
	"context"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/core/pkg/logger"
)

// RefundProcessView is the refund page/API projection (§4).
type RefundProcessView struct {
	FormID               string `json:"form_payment_id"`
	Status               string `json:"status"`
	FundsHeld            bool   `json:"funds_held"`
	FundsRefunded        bool   `json:"funds_refunded"`
	ReceivedAmount       string `json:"received_amount,omitempty"`
	ReceivedCurrency     string `json:"received_currency,omitempty"`
	RefundAmount         string `json:"refund_amount,omitempty"`
	RefundCurrency       string `json:"refund_currency,omitempty"`
	RefundFileID         string `json:"refund_file_id,omitempty"`
	InitiatedBy          string `json:"initiated_by,omitempty"`
	ConfirmedBy          string `json:"confirmed_by,omitempty"`
	CanCancelForm        bool   `json:"can_cancel_form"`
	UnrefundedBlocksCancel bool `json:"unrefunded_blocks_cancel"`
}

func (s *FormPaymentService) GetRefundProcess(ctx context.Context, principal authz.Principal, formID string) (RefundProcessView, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return RefundProcessView{}, err
	}
	form.UnpackDocsJSON()
	recvAmt := form.FundsReceivedAmount
	if recvAmt == "" {
		recvAmt = form.InvoiceAmount
	}
	recvCur := form.FundsReceivedCurrency
	if recvCur == "" {
		recvCur = form.Currency
	}
	held := form.HasUnrefundedFunds()
	return RefundProcessView{
		FormID: form.ID, Status: string(form.Status),
		FundsHeld: form.FundsHeld || held, FundsRefunded: form.FundsRefunded,
		ReceivedAmount: recvAmt, ReceivedCurrency: recvCur,
		RefundAmount: form.RefundAmount, RefundCurrency: form.RefundCurrency,
		RefundFileID: form.RefundFileID, InitiatedBy: form.RefundInitiatedBy, ConfirmedBy: form.RefundConfirmedBy,
		CanCancelForm: !held, UnrefundedBlocksCancel: held,
	}, nil
}

// InitRefund starts PAYMENT_REFUND_WAITING with amount/currency reconciliation.
func (s *FormPaymentService) InitRefund(ctx context.Context, principal authz.Principal, formID, amount, currency, comment string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	if form.Status == formpayment.StatusPaymentRefundWaiting || form.Status == formpayment.StatusPaymentRefundProcessing {
		// Idempotent re-entry
		return form, nil
	}
	if form.FundsRefunded {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeConflict, "funds already refunded")
	}
	if !form.FundsHeld {
		// Allow init after payment received statuses even if flag missing.
		switch form.Status {
		case formpayment.StatusPaymentReceived, formpayment.StatusPaymentProcessing, formpayment.StatusPaymentSent,
			formpayment.StatusSigningOrderAccepted, formpayment.StatusAdvanceSigningOrderAccepted,
			formpayment.StatusManagerChecking:
			form.MarkFundsReceived()
		default:
			return formpayment.Form{}, apperrors.New(apperrors.ErrCodeConflict, "no received funds to refund")
		}
	}
	if err := form.ValidateRefundAmount(amount, currency); err != nil {
		return formpayment.Form{}, err
	}
	if amount == "" {
		amount = form.FundsReceivedAmount
		if amount == "" {
			amount = form.InvoiceAmount
		}
	}
	if currency == "" {
		currency = form.FundsReceivedCurrency
		if currency == "" {
			currency = form.Currency
		}
	}
	form.RefundAmount = amount
	form.RefundCurrency = strings.ToUpper(currency)
	form.RefundInitiatedBy = principal.AccountID
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	next, err := s.Transition(ctx, principal, formID, formpayment.ActionRefundInit)
	if err != nil {
		return formpayment.Form{}, err
	}
	next.UnpackDocsJSON()
	next.RefundAmount = amount
	next.RefundCurrency = strings.ToUpper(currency)
	next.RefundInitiatedBy = principal.AccountID
	next.FundsHeld = true
	next.PackDocsJSON()
	_ = s.store.SaveForm(ctx, next)
	if comment != "" {
		_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
			ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
			FromStatus: form.Status, ToStatus: next.Status,
			Comment: refundComment("refund_init", comment), CreatedAt: time.Now().UTC(),
		})
	}
	logger.FromContext(logger.WithFormPaymentID(ctx, formID), nil).Info("refund initiated", "amount", amount, "currency", currency)
	return next, nil
}

// AttachRefundFile links optional confirmation file to the refund process.
func (s *FormPaymentService) AttachRefundFile(ctx context.Context, principal authz.Principal, formID, fileID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		return formpayment.Form{}, err
	}
	if fileID == "" {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "file_id required")
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	switch form.Status {
	case formpayment.StatusPaymentRefundWaiting, formpayment.StatusPaymentRefundProcessing, formpayment.StatusPaymentRefundSent:
	default:
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeConflict, "attach refund file only during refund process")
	}
	form.RefundFileID = fileID
	refs := formpayment.ParseDocRefs(form.DocsJSON)
	refs = append(refs, formpayment.DocFileRef{FileID: fileID, Kind: "refund_confirmation", Label: "refund"})
	form.DocsJSON = formpayment.EncodeDocsBundle(formpayment.DocsBundle{
		Files: refs,
		POG:   pogPtr(form),
		Refund: &formpayment.RefundState{
			Amount: form.RefundAmount, Currency: form.RefundCurrency,
			ReceivedAmount: form.FundsReceivedAmount, ReceivedCurrency: form.FundsReceivedCurrency,
			FileID: fileID, InitiatedBy: form.RefundInitiatedBy, ConfirmedBy: form.RefundConfirmedBy,
			FundsHeld: form.FundsHeld, FundsRefunded: form.FundsRefunded,
		},
	})
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
		FromStatus: form.Status, ToStatus: form.Status,
		Comment: "refund_file_attached:" + fileID, CreatedAt: time.Now().UTC(),
	})
	return form, nil
}

// ConfirmRefundSent marks REFUND_SENT and clears unrefunded funds (idempotent).
func (s *FormPaymentService) ConfirmRefundSent(ctx context.Context, principal authz.Principal, formID, comment string) (formpayment.Form, error) {
	form, err := s.Transition(ctx, principal, formID, formpayment.ActionRefundSent)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	form.MarkFundsRefunded(principal.AccountID)
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: formID, ActorID: principal.AccountID,
		FromStatus: formpayment.StatusPaymentRefundProcessing, ToStatus: form.Status,
		Comment: refundComment("refund_sent", comment), CreatedAt: time.Now().UTC(),
	})
	return form, nil
}

func pogPtr(form formpayment.Form) *formpayment.POGState {
	if form.POGStatus == "" && form.POGFileID == "" {
		return nil
	}
	return &formpayment.POGState{Status: form.POGStatus, FileID: form.POGFileID, Attempts: form.POGAttempts, Kind: form.POGKind}
}

func refundComment(action, comment string) string {
	if comment == "" {
		return action
	}
	return action + ": " + comment
}

// syncRefundAfterTransition packs funds flags after payment/refund SM steps.
func (s *FormPaymentService) syncRefundAfterTransition(ctx context.Context, before, next formpayment.Form, action formpayment.Action, actorID string) error {
	next.UnpackDocsJSON()
	changed := false
	switch action {
	case formpayment.ActionPaymentReceived, formpayment.ActionPaymentSent, formpayment.ActionPaymentStart, formpayment.ActionProviderSent:
		next.MarkFundsReceived()
		changed = true
	case formpayment.ActionRefundInit:
		next.FundsHeld = true
		if next.RefundInitiatedBy == "" {
			next.RefundInitiatedBy = actorID
		}
		changed = true
	case formpayment.ActionRefundSent:
		next.MarkFundsRefunded(actorID)
		changed = true
	}
	if !changed {
		return nil
	}
	next.PackDocsJSON()
	return s.store.SaveForm(ctx, next)
}
