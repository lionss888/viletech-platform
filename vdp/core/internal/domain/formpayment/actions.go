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
	ActionICOStart          Action = "ico_start"
	ActionICOApprove        Action = "ico_approve"
	ActionICOReject         Action = "ico_reject"
	ActionECOStart          Action = "eco_start"
	ActionECOAccept         Action = "eco_accept"
	ActionECOReject         Action = "eco_reject"
	ActionManagerSendOrder  Action = "manager_send_order"
	ActionManagerAcceptOrder Action = "manager_accept_order"
	ActionAssignDeadline    Action = "assign_deadline"
	ActionAssignProvider    Action = "assign_provider"
	ActionAssignAgent       Action = "assign_agent"
	ActionProviderStart     Action = "provider_start"
	ActionProviderSent      Action = "provider_sent"
	ActionProviderReturn    Action = "provider_return"
	ActionInternalCallback  Action = "internal_callback"
)

func RolesForAction(action Action) []domain.Role {
	switch action {
	case ActionRecognizeComplete:
		return []domain.Role{domain.RoleRoot, domain.RoleUser, domain.RoleManager}
	case ActionSubmit, ActionCancel:
		return []domain.Role{domain.RoleUser, domain.RoleRoot}
	case ActionICOStart, ActionICOApprove, ActionICOReject:
		return []domain.Role{domain.RoleInternalComplianceOfficer, domain.RoleRoot}
	case ActionECOStart, ActionECOAccept, ActionECOReject:
		return []domain.Role{domain.RoleComplianceOfficer, domain.RoleRoot}
	case ActionManagerSendOrder, ActionManagerAcceptOrder, ActionAssignDeadline, ActionAssignProvider, ActionAssignAgent:
		return []domain.Role{domain.RoleManager, domain.RoleRoot}
	case ActionProviderStart, ActionProviderSent, ActionProviderReturn:
		return []domain.Role{domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleRoot}
	case ActionInternalCallback:
		return []domain.Role{domain.RoleRoot, domain.RoleOneC}
	default:
		return nil
	}
}

func RoleMayPerform(role domain.Role, action Action) bool {
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
		return cancelStatusFor(form.Status)
	case ActionICOStart:
		return StatusOrganizationVerification, nil
	case ActionICOApprove:
		return StatusFormWaitingVerification, nil
	case ActionICOReject:
		return StatusFormWaitingCorrections, nil
	case ActionECOStart:
		return StatusFormVerification, nil
	case ActionECOAccept:
		return StatusFormAccepted, nil
	case ActionECOReject:
		return StatusFormWaitingCorrections, nil
	case ActionManagerSendOrder:
		return StatusSigningOrder, nil
	case ActionManagerAcceptOrder:
		return StatusSigningOrderAccepted, nil
	case ActionProviderStart:
		return StatusPaymentProcessing, nil
	case ActionProviderSent:
		return StatusPaymentSent, nil
	case ActionProviderReturn:
		return StatusManagerChecking, nil
	default:
		return "", apperrors.New(apperrors.ErrCodeValidation, fmt.Sprintf("unknown action %s", action))
	}
}

func cancelStatusFor(from Status) (Status, error) {
	switch from {
	case StatusDraft, StatusOrganizationWaitingVerification, StatusOrganizationVerification,
		StatusFormWaitingVerification, StatusFormVerification, StatusFormAccepted,
		StatusFormWaitingCorrections, StatusSigningOrder, StatusSigningOrderWaitingCorrections,
		StatusSigningOrderVerification, StatusAdvanceSigningOrder, StatusManagerChecking:
		return StatusCanceledByUser, nil
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
