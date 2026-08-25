package formpayment

// NestPathAction maps Nest controller path suffixes (after /form-payment/{id}/) to domain actions.
func NestPathAction(rolePrefix, pathSuffix string) (Action, bool) {
	key := rolePrefix + "|" + pathSuffix
	action, ok := nestActionMap[key]
	return action, ok
}

// NestMetaPath is a Nest path that mutates form fields or triggers side-effects without SM transition.
func NestMetaPath(rolePrefix, pathSuffix string) (MetaKind, bool) {
	key := rolePrefix + "|" + pathSuffix
	kind, ok := nestMetaMap[key]
	return kind, ok
}

type MetaKind string

const (
	MetaImportantOn      MetaKind = "important_on"
	MetaImportantOff     MetaKind = "important_off"
	MetaOrderGenerate    MetaKind = "order_generate"
	MetaReportGenerate   MetaKind = "report_generate"
	MetaReportDiadoc     MetaKind = "report_diadoc_sign"
	MetaOrderDiadoc      MetaKind = "order_diadoc_sign"
	MetaAnalyzeCounterparty MetaKind = "analyze_counterparty"
	MetaPayments         MetaKind = "payments"
	MetaAdditional       MetaKind = "additional"
	MetaCopy             MetaKind = "copy"
	MetaSetManager       MetaKind = "set_manager"
	MetaTreasurerUpload  MetaKind = "treasurer_upload"
	MetaTreasurerDelete  MetaKind = "treasurer_delete"
)

var nestActionMap = map[string]Action{
	// site
	"site|cancel":                              ActionCancel,
	"site|form/accept":                         ActionSubmit,
	"site|form/accept-corrections":             ActionSubmit,
	"site|order":                               ActionUserUploadOrder,
	"site|order-advance":                       ActionAdvanceUserUpload,
	"site|report":                              ActionReportUpload,
	"site|shipment":                            ActionShipmentUpload,
	"site|shipment/accept":                     ActionShipmentAcceptUser,
	"site|signing-order-verification-treasurer": ActionTreasurerUserVerify,

	// manager form / cancel / complete
	"manager|cancel":      ActionCancelByManager,
	"manager|completed":   ActionComplete,
	"manager|form/start":  ActionManagerFormStart,
	"manager|form/stop":   ActionManagerFormStop,
	"manager|form/accept": ActionManagerFormAccept,
	"manager|form/reject": ActionManagerFormReject,

	// manager order
	"manager|order/start":   ActionOrderStart,
	"manager|order/stop":    ActionOrderStop,
	"manager|order/accept":  ActionOrderAccept,
	"manager|order/reject":  ActionOrderReject,
	"manager|order/signing": ActionOrderSigning,

	// manager advance order
	"manager|order-advance/start":   ActionAdvanceStart,
	"manager|order-advance/stop":    ActionAdvanceStop,
	"manager|order-advance/accept":  ActionAdvanceAccept,
	"manager|order-advance/reject":  ActionAdvanceReject,
	"manager|order-advance/revoke":  ActionAdvanceRevoke,
	"manager|order-advance/signing": ActionAdvanceSigning,

	// manager payment
	"manager|payment/received":      ActionPaymentReceived,
	"manager|payment/start":         ActionPaymentStart,
	"manager|payment/stop":          ActionPaymentStop,
	"manager|payment/sent":          ActionPaymentSent,
	"manager|payment/return-to-sent": ActionPaymentReturnSent,
	"manager|payment/cancel":        ActionPaymentCancelToAccepted,

	// manager shipment
	"manager|shipment/start":  ActionShipmentStart,
	"manager|shipment/stop":   ActionShipmentStop,
	"manager|shipment/accept": ActionShipmentAccept,
	"manager|shipment/reject": ActionShipmentReject,

	// manager report
	"manager|report/start":   ActionReportStart,
	"manager|report/stop":    ActionReportStop,
	"manager|report/accept":  ActionReportAccept,
	"manager|report/reject":  ActionReportReject,
	"manager|report/revoke":  ActionReportRevoke,
	"manager|report/signing": ActionReportSigning,
	"manager|report":         ActionReportUploadManager,

	// manager refund
	"manager|refund/init":   ActionRefundInit,
	"manager|refund/start":  ActionRefundStart,
	"manager|refund/stop":   ActionRefundStop,
	"manager|refund/sent":   ActionRefundSent,
	"manager|refund/cancel": ActionRefundCancel,

	// provider
	"provider|payment/received": ActionPaymentReceived,
	"provider|payment/start":    ActionProviderStart,
	"provider|payment/stop":     ActionPaymentStop,
	"provider|payment/sent":     ActionProviderSent,
	"provider|payment/cancel":   ActionPaymentCancelToAccepted,
	"provider|form/manager":     ActionProviderReturn,

	// eco
	"eco|cancel":      ActionCancelByECO,
	"eco|form/start":  ActionECOStart,
	"eco|form/stop":   ActionECOStop,
	"eco|form/accept":  ActionECOAccept,
	"eco|form/reject":  ActionECOReject,

	// ico
	"ico|cancel":      ActionCancelByICO,
	"ico|form/start":  ActionICOStart,
	"ico|form/stop":   ActionICOStop,
	"ico|form/accept": ActionICOApprove,
	"ico|form/reject": ActionICOReject,

	// treasurer
	"treasurer|confirm-payment":                 ActionTreasurerConfirm,
	"treasurer|signing-order-treasurer":         ActionTreasurerSigning,
	"treasurer|return-to-payment-sent-treasurer": ActionTreasurerReturn,
	"treasurer|order-waiting-correction-treasurer": ActionTreasurerCorrection,
	"treasurer|complete-from-verification-treasurer": ActionTreasurerComplete,
	"treasurer|return-to-signing-order-treasurer": ActionTreasurerBackToSigning,
}

var nestMetaMap = map[string]MetaKind{
	"manager|make-important":           MetaImportantOn,
	"manager|make-unimportant":         MetaImportantOff,
	"provider|make-important":          MetaImportantOn,
	"provider|make-unimportant":        MetaImportantOff,
	"manager|order/generate":           MetaOrderGenerate,
	"manager|generate-agent-report":    MetaReportGenerate,
	"manager|report/sign-via-diadoc":   MetaReportDiadoc,
	"site|payment-order/sign-via-diadoc": MetaOrderDiadoc,
	"eco|analyze-counterparty":         MetaAnalyzeCounterparty,
	"site|payments":                  MetaPayments,
	"site|additional":                MetaAdditional,
}
