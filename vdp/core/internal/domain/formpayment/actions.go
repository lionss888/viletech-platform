package formpayment

import (
	"fmt"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type Action string

const (
	ActionRecognizeComplete Action = "recognize_complete"
	ActionSubmit            Action = "submit"
	ActionCancel            Action = "cancel"
	ActionCancelByManager   Action = "cancel_by_manager"
	ActionCancelByECO       Action = "cancel_by_eco"
	ActionCancelByICO       Action = "cancel_by_ico"
	ActionICOStart          Action = "ico_start"
	ActionICOStop           Action = "ico_stop"
	ActionICOApprove        Action = "ico_approve"
	ActionICOReject         Action = "ico_reject"
	ActionECOStart          Action = "eco_start"
	ActionECOStop           Action = "eco_stop"
	ActionECOAccept         Action = "eco_accept"
	ActionECOReject         Action = "eco_reject"
	ActionManagerFormStart  Action = "manager_form_start"
	ActionManagerFormStop   Action = "manager_form_stop"
	ActionManagerFormAccept Action = "manager_form_accept"
	ActionManagerFormReject Action = "manager_form_reject"
	ActionManagerSendOrder  Action = "manager_send_order"
	ActionOrderStart        Action = "order_start"
	ActionOrderStop         Action = "order_stop"
	ActionOrderAccept       Action = "order_accept"
	ActionOrderReject       Action = "order_reject"
	ActionOrderSigning      Action = "order_signing"
	ActionUserUploadOrder   Action = "user_upload_order"
	ActionAdvanceSigning    Action = "advance_signing"
	ActionAdvanceAccept     Action = "advance_accept"
	ActionAdvanceReject     Action = "advance_reject"
	ActionPaymentReceived   Action = "payment_received"
	ActionPaymentStart      Action = "payment_start"
	ActionPaymentStop       Action = "payment_stop"
	ActionPaymentSent       Action = "payment_sent"
	ActionPaymentReturnSent Action = "payment_return_to_sent"
	ActionProviderStart     Action = "provider_start"
	ActionProviderSent      Action = "provider_sent"
	ActionProviderReturn    Action = "provider_return"
	ActionReportSigning     Action = "report_signing"
	ActionReportDiadoc      Action = "report_diadoc"
	ActionReportUpload      Action = "report_upload"
	ActionReportStart       Action = "report_start"
	ActionReportAccept      Action = "report_accept"
	ActionReportReject      Action = "report_reject"
	ActionShipmentWaiting   Action = "shipment_waiting"
	ActionShipmentUpload    Action = "shipment_upload"
	ActionShipmentStart     Action = "shipment_start"
	ActionShipmentAccept    Action = "shipment_accept"
	ActionShipmentReject    Action = "shipment_reject"
	ActionRefundInit        Action = "refund_init"
	ActionRefundStart       Action = "refund_start"
	ActionRefundSent        Action = "refund_sent"
	ActionRefundCancel      Action = "refund_cancel"
	ActionComplete          Action = "complete"
	ActionTreasurerConfirm  Action = "treasurer_confirm"
	ActionTreasurerSigning  Action = "treasurer_signing"
	ActionTreasurerReturn   Action = "treasurer_return"
	ActionAssignDeadline    Action = "assign_deadline"
	ActionAssignProvider    Action = "assign_provider"
	ActionAssignAgent       Action = "assign_agent"
	ActionInternalCallback  Action = "internal_callback"
)

func RolesForAction(action Action) []domain.Role {
	switch action {
	case ActionRecognizeComplete:
		return []domain.Role{domain.RoleRoot, domain.RoleUser, domain.RoleManager}
	case ActionSubmit, ActionUserUploadOrder, ActionReportUpload, ActionShipmentUpload:
		return []domain.Role{domain.RoleUser, domain.RoleRoot}
	case ActionCancel:
		return []domain.Role{domain.RoleUser, domain.RoleRoot}
	case ActionCancelByManager, ActionManagerFormStart, ActionManagerFormStop, ActionManagerFormAccept, ActionManagerFormReject,
		ActionManagerSendOrder, ActionOrderStart, ActionOrderStop, ActionOrderAccept, ActionOrderReject, ActionOrderSigning,
		ActionAdvanceSigning, ActionAdvanceAccept, ActionAdvanceReject,
		ActionPaymentReceived, ActionPaymentStart, ActionPaymentStop, ActionPaymentSent, ActionPaymentReturnSent,
		ActionReportSigning, ActionReportDiadoc, ActionReportStart, ActionReportAccept, ActionReportReject,
		ActionShipmentWaiting, ActionShipmentStart, ActionShipmentAccept, ActionShipmentReject,
		ActionRefundInit, ActionRefundStart, ActionRefundSent, ActionRefundCancel, ActionComplete,
		ActionAssignDeadline, ActionAssignProvider, ActionAssignAgent:
		return []domain.Role{domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot}
	case ActionCancelByICO, ActionICOStart, ActionICOStop, ActionICOApprove, ActionICOReject:
		return []domain.Role{domain.RoleInternalComplianceOfficer, domain.RoleRoot}
	case ActionCancelByECO, ActionECOStart, ActionECOStop, ActionECOAccept, ActionECOReject:
		return []domain.Role{domain.RoleComplianceOfficer, domain.RoleRoot}
	case ActionProviderStart, ActionProviderSent, ActionProviderReturn:
		return []domain.Role{domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleManager, domain.RoleRoot}
	case ActionTreasurerConfirm, ActionTreasurerSigning, ActionTreasurerReturn:
		return []domain.Role{domain.RoleTreasurer, domain.RoleRoot}
	case ActionInternalCallback:
		return []domain.Role{domain.RoleRoot, domain.RoleOneC}
	default:
		return nil
	}
}

func RoleMayPerform(role domain.Role, action Action) bool {
	if role == domain.RoleRoot {
		return true
	}
	for _, allowed := range RolesForAction(action) {
		if allowed == role {
			return true
		}
	}
	return false
}

func TargetStatus(form Form, action Action, orgApproved bool) (Status, error) {
	switch action {
	case ActionRecognizeComplete:
		return StatusDraft, nil
	case ActionSubmit:
		if orgApproved {
			return StatusFormWaitingVerification, nil
		}
		return StatusOrganizationWaitingVerification, nil
	case ActionCancel:
		return cancelStatusFor(form.Status, StatusCanceledByUser)
	case ActionCancelByManager:
		return cancelStatusFor(form.Status, StatusCanceledByManager)
	case ActionCancelByECO:
		return cancelStatusFor(form.Status, StatusCanceledByComplianceOfficer)
	case ActionCancelByICO:
		return cancelStatusFor(form.Status, StatusCanceledByInternalComplianceOfficer)
	case ActionICOStart:
		return StatusOrganizationVerification, nil
	case ActionICOStop:
		return StatusOrganizationWaitingVerification, nil
	case ActionICOApprove:
		return StatusFormWaitingVerification, nil
	case ActionICOReject:
		return StatusFormWaitingCorrections, nil
	case ActionECOStart, ActionManagerFormStart:
		return StatusFormVerification, nil
	case ActionECOStop, ActionManagerFormStop:
		return StatusFormWaitingVerification, nil
	case ActionECOAccept, ActionManagerFormAccept:
		return StatusFormAccepted, nil
	case ActionECOReject, ActionManagerFormReject:
		return StatusFormWaitingCorrections, nil
	case ActionManagerSendOrder, ActionOrderSigning:
		return StatusSigningOrder, nil
	case ActionUserUploadOrder:
		return StatusSigningOrderWaitingVerification, nil
	case ActionOrderStart:
		return StatusSigningOrderVerification, nil
	case ActionOrderStop:
		return StatusSigningOrderWaitingVerification, nil
	case ActionOrderAccept:
		return StatusSigningOrderAccepted, nil
	case ActionOrderReject:
		return StatusSigningOrderWaitingCorrections, nil
	case ActionAdvanceSigning:
		return StatusAdvanceSigningOrder, nil
	case ActionAdvanceAccept:
		return StatusAdvanceSigningOrderAccepted, nil
	case ActionAdvanceReject:
		return StatusAdvanceSigningOrderWaitingCorrections, nil
	case ActionPaymentReceived:
		return StatusPaymentReceived, nil
	case ActionPaymentStart, ActionProviderStart:
		return StatusPaymentProcessing, nil
	case ActionPaymentStop:
		return StatusPaymentReceived, nil
	case ActionPaymentSent, ActionProviderSent:
		return StatusPaymentSent, nil
	case ActionPaymentReturnSent:
		return StatusPaymentSent, nil
	case ActionProviderReturn:
		return StatusManagerChecking, nil
	case ActionReportSigning:
		return StatusReportWaiting, nil
	case ActionReportDiadoc:
		return StatusReportWaitingDiadoc, nil
	case ActionReportUpload:
		return StatusReportWaitingVerification, nil
	case ActionReportStart:
		return StatusReportVerification, nil
	case ActionReportAccept:
		return StatusReportAccepted, nil
	case ActionReportReject:
		return StatusReportWaitingCorrections, nil
	case ActionShipmentWaiting:
		return StatusShipmentWaiting, nil
	case ActionShipmentUpload:
		return StatusShipmentWaitingVerification, nil
	case ActionShipmentStart:
		return StatusShipmentVerification, nil
	case ActionShipmentAccept:
		return StatusCompleted, nil
	case ActionShipmentReject:
		return StatusShipmentWaitingCorrections, nil
	case ActionRefundInit:
		return StatusPaymentRefundWaiting, nil
	case ActionRefundStart:
		return StatusPaymentRefundProcessing, nil
	case ActionRefundSent:
		return StatusPaymentRefundSent, nil
	case ActionRefundCancel:
		return StatusSigningOrderAccepted, nil
	case ActionComplete:
		return StatusCompleted, nil
	case ActionTreasurerConfirm:
		return StatusPaymentSentTreasurer, nil
	case ActionTreasurerSigning:
		return StatusSigningOrderTreasurer, nil
	case ActionTreasurerReturn:
		return StatusPaymentSentTreasurer, nil
	default:
		return "", apperrors.New(apperrors.ErrCodeValidation, fmt.Sprintf("unknown action %s", action))
	}
}

func cancelStatusFor(from, target Status) (Status, error) {
	switch from {
	case StatusDraft, StatusOrganizationWaitingVerification, StatusOrganizationVerification,
		StatusFormWaitingVerification, StatusFormVerification, StatusFormAccepted,
		StatusFormWaitingCorrections, StatusSigningOrder, StatusSigningOrderWaitingCorrections,
		StatusSigningOrderVerification, StatusAdvanceSigningOrder, StatusManagerChecking,
		StatusReportWaiting, StatusReportWaitingVerification, StatusReportVerification:
		return target, nil
	default:
		return "", apperrors.New(apperrors.ErrCodeConflict, "cancel is not allowed from current status")
	}
}

func CanSeeForm(role domain.Role, accountID string, form Form) bool {
	switch role {
	case domain.RoleUser:
		return form.AccountID == accountID
	case domain.RoleProvider, domain.RoleSeniorProvider:
		return form.ProviderID == accountID
	case domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot,
		domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleOneC:
		return true
	default:
		return false
	}
}

// NestPathAction maps Nest-like path suffixes to domain actions.
func NestPathAction(rolePrefix, pathSuffix string) (Action, bool) {
	key := rolePrefix + "|" + pathSuffix
	action, ok := nestActionMap[key]
	return action, ok
}

var nestActionMap = map[string]Action{
	"site|cancel":              ActionCancel,
	"site|form/accept":         ActionSubmit,
	"site|order":               ActionUserUploadOrder,
	"site|report":              ActionReportUpload,
	"site|shipment":            ActionShipmentUpload,
	"manager|cancel":           ActionCancelByManager,
	"manager|form/start":       ActionManagerFormStart,
	"manager|form/stop":        ActionManagerFormStop,
	"manager|form/accept":      ActionManagerFormAccept,
	"manager|form/reject":      ActionManagerFormReject,
	"manager|order/signing":    ActionOrderSigning,
	"manager|order/start":      ActionOrderStart,
	"manager|order/stop":       ActionOrderStop,
	"manager|order/accept":     ActionOrderAccept,
	"manager|order/reject":     ActionOrderReject,
	"manager|payment/received": ActionPaymentReceived,
	"manager|payment/start":    ActionPaymentStart,
	"manager|payment/stop":     ActionPaymentStop,
	"manager|payment/sent":     ActionPaymentSent,
	"manager|report/signing":   ActionReportSigning,
	"manager|report/start":     ActionReportStart,
	"manager|report/accept":    ActionReportAccept,
	"manager|report/reject":    ActionReportReject,
	"manager|shipment/start":   ActionShipmentStart,
	"manager|shipment/accept":  ActionShipmentAccept,
	"manager|shipment/reject":  ActionShipmentReject,
	"manager|refund/init":      ActionRefundInit,
	"manager|refund/start":     ActionRefundStart,
	"manager|refund/sent":      ActionRefundSent,
	"manager|completed":        ActionComplete,
	"provider|payment/start":   ActionProviderStart,
	"provider|payment/sent":    ActionProviderSent,
	"provider|form/manager":    ActionProviderReturn,
	"eco|form/start":           ActionECOStart,
	"eco|form/stop":            ActionECOStop,
	"eco|form/accept":          ActionECOAccept,
	"eco|form/reject":          ActionECOReject,
	"eco|cancel":               ActionCancelByECO,
	"ico|form/start":           ActionICOStart,
	"ico|form/stop":            ActionICOStop,
	"ico|form/accept":          ActionICOApprove,
	"ico|form/reject":          ActionICOReject,
	"ico|cancel":               ActionCancelByICO,
	"treasurer|confirm-payment": ActionTreasurerConfirm,
	"treasurer|signing-order-treasurer": ActionTreasurerSigning,
}
