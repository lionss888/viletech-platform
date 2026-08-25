package formpayment

type Status string

const (
	StatusCreating                             Status = "creating"
	StatusDraft                                Status = "draft"
	StatusOrganizationWaitingVerification      Status = "organization_waiting_verification"
	StatusOrganizationVerification             Status = "organization_verification"
	StatusFormWaitingVerification              Status = "form_waiting_verification"
	StatusFormWaitingCorrections               Status = "form_waiting_corrections"
	StatusFormVerification                     Status = "form_verification"
	StatusFormAccepted                         Status = "form_accepted"
	StatusSigningOrder                         Status = "signing_order"
	StatusSigningOrderWaitingVerification      Status = "signing_order_waiting_verification"
	StatusSigningOrderWaitingCorrections       Status = "signing_order_waiting_corrections"
	StatusSigningOrderVerification             Status = "signing_order_verification"
	StatusSigningOrderAccepted                 Status = "signing_order_accepted"
	StatusAdvanceSigningOrder                  Status = "advance_signing_order"
	StatusAdvanceSigningOrderWaitingVerification Status = "advance_signing_order_waiting_verification"
	StatusAdvanceSigningOrderWaitingCorrections  Status = "advance_signing_order_waiting_corrections"
	StatusAdvanceSigningOrderVerification      Status = "advance_signing_order_verification"
	StatusAdvanceSigningOrderAccepted          Status = "advance_signing_order_accepted"
	StatusPaymentReceived                      Status = "payment_received"
	StatusPaymentProcessing                    Status = "payment_processing"
	StatusPaymentSent                          Status = "payment_sent"
	StatusReportWaiting                        Status = "report_waiting"
	StatusReportWaitingDiadoc                  Status = "report_waiting_diadoc"
	StatusReportWaitingVerification            Status = "report_waiting_verification"
	StatusReportWaitingCorrections             Status = "report_waiting_corrections"
	StatusReportVerification                   Status = "report_verification"
	StatusReportAccepted                       Status = "report_accepted"
	StatusShipmentWaiting                      Status = "shipment_waiting"
	StatusShipmentWaitingVerification          Status = "shipment_waiting_verification"
	StatusShipmentWaitingCorrections           Status = "shipment_waiting_corrections"
	StatusShipmentVerification                 Status = "shipment_verification"
	StatusManagerChecking                      Status = "manager_checking"
	StatusContractWaiting                      Status = "contract_waiting"
	StatusContractWaitingCorrection            Status = "contract_waiting_correction"
	StatusContractVerification                 Status = "contract_verification"
	StatusPaymentRefundWaiting                 Status = "payment_refund_waiting"
	StatusPaymentRefundProcessing              Status = "payment_refund_processing"
	StatusPaymentRefundSent                    Status = "payment_refund_sent"
	StatusPaymentSentTreasurer                 Status = "payment_sent_treasurer"
	StatusSigningOrderTreasurer                Status = "signing_order_treasurer"
	StatusSigningOrderVerificationTreasurer    Status = "signing_order_verification_treasurer"
	StatusOrderWaitingCorrectionTreasurer      Status = "order_waiting_correction_treasurer"
	StatusOverpaymentExport                    Status = "overpayment_export"
	StatusOverpaymentImport                    Status = "overpayment_import"
	StatusEqual                                Status = "equal"
	StatusCompleted                            Status = "completed"
	StatusCanceledByUser                       Status = "canceled_by_user"
	StatusCanceledByManager                    Status = "canceled_by_manager"
	StatusCanceledByComplianceOfficer          Status = "canceled_by_compliance_officer"
	StatusCanceledByInternalComplianceOfficer  Status = "canceled_by_internal_compliance_officer"
)

type Direction string

const (
	DirectionImport Direction = "import"
	DirectionExport Direction = "export"
)

type Kind string

const (
	KindGood    Kind = "good"
	KindService Kind = "service"
)
