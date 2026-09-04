package formpayment

// Capability is a code-owned right; root binds capabilities to roles in DB config.
type Capability string

const (
	CapFormView              Capability = "form.view"
	CapFormSubmit            Capability = "form.submit"
	CapFormCancelUser        Capability = "form.cancel_user"
	CapFormRecognize         Capability = "form.recognize"
	CapOrgCompliance         Capability = "org.compliance"
	CapFormCompliance        Capability = "form.compliance"
	CapManagerOps            Capability = "manager.ops"
	CapManagerPayment        Capability = "manager.payment"
	CapProviderPayment       Capability = "provider.payment"
	CapTreasurerOps          Capability = "treasurer.ops"
	CapUserDocs              Capability = "user.docs"
	CapInternalCallback      Capability = "internal.callback"
	CapSalesAttribution      Capability = "sales.attribution"
)

// AllCapabilities returns the fixed catalog for admin UI / validation.
func AllCapabilities() []Capability {
	return []Capability{
		CapFormView, CapFormSubmit, CapFormCancelUser, CapFormRecognize,
		CapOrgCompliance, CapFormCompliance, CapManagerOps, CapManagerPayment,
		CapProviderPayment, CapTreasurerOps, CapUserDocs, CapInternalCallback,
		CapSalesAttribution,
	}
}

func IsKnownCapability(c Capability) bool {
	for _, known := range AllCapabilities() {
		if known == c {
			return true
		}
	}
	return false
}

// TransitionCapability is true when the capability can change form status.
func TransitionCapability(c Capability) bool {
	switch c {
	case CapFormView, CapSalesAttribution:
		return false
	default:
		return true
	}
}

// CapabilityForAction maps a domain action to the capability that authorizes it.
func CapabilityForAction(action Action) Capability {
	switch action {
	case ActionRecognizeComplete:
		return CapFormRecognize
	case ActionSubmit, ActionCancel:
		if action == ActionCancel {
			return CapFormCancelUser
		}
		return CapFormSubmit
	case ActionUserUploadOrder, ActionUserUploadContract, ActionAdvanceUserUpload,
		ActionReportUpload, ActionShipmentUpload, ActionShipmentAcceptUser, ActionTreasurerUserVerify:
		return CapUserDocs
	case ActionCancelByICO, ActionICOStart, ActionICOStop, ActionICOApprove, ActionICOReject:
		return CapOrgCompliance
	case ActionCancelByECO, ActionECOStart, ActionECOStop, ActionECOAccept, ActionECOReject:
		return CapFormCompliance
	case ActionCancelByManager, ActionManagerFormStart, ActionManagerFormStop, ActionManagerFormAccept, ActionManagerFormReject,
		ActionManagerSendOrder, ActionOrderStart, ActionOrderStop, ActionOrderAccept, ActionOrderReject, ActionOrderSigning,
		ActionAdvanceSigning, ActionAdvanceStart, ActionAdvanceStop, ActionAdvanceAccept, ActionAdvanceReject, ActionAdvanceRevoke,
		ActionPaymentReturnSent, ActionPaymentCancelToAccepted,
		ActionReportSigning, ActionReportDiadoc, ActionReportUploadManager, ActionReportStart, ActionReportStop, ActionReportAccept, ActionReportReject, ActionReportRevoke,
		ActionShipmentWaiting, ActionShipmentStart, ActionShipmentStop, ActionShipmentAccept, ActionShipmentReject,
		ActionRefundInit, ActionRefundStart, ActionRefundStop, ActionRefundSent, ActionRefundCancel, ActionComplete,
		ActionAssignDeadline, ActionAssignProvider, ActionAssignAgent:
		return CapManagerOps
	case ActionPaymentReceived, ActionPaymentStart, ActionPaymentStop, ActionPaymentSent:
		return CapManagerPayment
	case ActionProviderStart, ActionProviderSent, ActionProviderReturn:
		return CapProviderPayment
	case ActionTreasurerConfirm, ActionTreasurerSigning, ActionTreasurerReturn, ActionTreasurerCorrection,
		ActionTreasurerComplete, ActionTreasurerBackToSigning:
		return CapTreasurerOps
	case ActionInternalCallback:
		return CapInternalCallback
	default:
		return ""
	}
}
