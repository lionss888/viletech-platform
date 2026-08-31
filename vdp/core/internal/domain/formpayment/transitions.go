package formpayment

func clone(src map[Status][]Status) map[Status][]Status {
	out := make(map[Status][]Status, len(src))
	for k, v := range src {
		cp := make([]Status, len(v))
		copy(cp, v)
		out[k] = cp
	}
	return out
}

func merge(base map[Status][]Status, overlay map[Status][]Status) map[Status][]Status {
	out := clone(base)
	for from, extras := range overlay {
		seen := map[Status]struct{}{}
		merged := append([]Status{}, out[from]...)
		for _, s := range merged {
			seen[s] = struct{}{}
		}
		for _, s := range extras {
			if _, ok := seen[s]; !ok {
				merged = append(merged, s)
				seen[s] = struct{}{}
			}
		}
		out[from] = merged
	}
	return out
}

var transitionsImportForm = map[Status][]Status{
	StatusCreating: {StatusDraft},
	StatusDraft: {
		StatusCanceledByComplianceOfficer,
		StatusCanceledByUser,
		StatusOrganizationWaitingVerification,
		StatusFormWaitingVerification,
	},
	StatusFormWaitingCorrections: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusFormWaitingVerification,
		StatusFormAccepted,
	},
	StatusSigningOrder: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusSigningOrderWaitingVerification,
		StatusFormAccepted,
	},
	StatusSigningOrderWaitingCorrections: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusSigningOrderWaitingVerification,
	},
	StatusAdvanceSigningOrder: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusAdvanceSigningOrderWaitingVerification,
		StatusPaymentReceived,
		StatusPaymentSent,
	},
	StatusAdvanceSigningOrderWaitingCorrections: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusAdvanceSigningOrderWaitingVerification,
	},
	StatusAdvanceSigningOrderWaitingVerification: {StatusAdvanceSigningOrderVerification},
	StatusAdvanceSigningOrderVerification: {
		StatusAdvanceSigningOrderWaitingVerification,
		StatusAdvanceSigningOrderAccepted,
		StatusAdvanceSigningOrderWaitingCorrections,
		StatusFormWaitingCorrections,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusShipmentWaiting: {
		StatusShipmentWaitingVerification,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusOrganizationWaitingVerification: {
		StatusOrganizationVerification,
		StatusCanceledByUser,
		StatusCanceledByInternalComplianceOfficer,
	},
	StatusOrganizationVerification: {
		StatusCanceledByUser,
		StatusCanceledByInternalComplianceOfficer,
		StatusFormWaitingCorrections,
		StatusFormWaitingVerification,
		StatusOrganizationWaitingVerification,
	},
	StatusFormWaitingVerification: {
		StatusCanceledByComplianceOfficer,
		StatusCanceledByUser,
		StatusFormVerification,
	},
	StatusFormVerification: {
		StatusCanceledByComplianceOfficer,
		StatusCanceledByUser,
		StatusFormAccepted,
		StatusFormWaitingCorrections,
		StatusFormWaitingVerification,
	},
	StatusFormAccepted: {
		StatusSigningOrder,
		StatusContractWaiting,
		StatusContractVerification,
		StatusContractWaitingCorrection,
		StatusFormWaitingCorrections,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusContractWaiting: {
		StatusSigningOrder,
		StatusContractVerification,
		StatusContractWaitingCorrection,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusContractVerification: {
		StatusSigningOrder,
		StatusContractWaitingCorrection,
		StatusFormWaitingCorrections,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusContractWaitingCorrection: {
		StatusContractWaiting,
		StatusContractVerification,
		StatusSigningOrder,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusSigningOrderWaitingVerification: {StatusSigningOrderVerification},
	StatusSigningOrderVerification: {
		StatusSigningOrderWaitingVerification,
		StatusSigningOrderAccepted,
		StatusSigningOrderWaitingCorrections,
		StatusFormWaitingCorrections,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusSigningOrderAccepted: {
		StatusPaymentReceived,
		StatusPaymentRefundWaiting,
		StatusPaymentProcessing,
		StatusSigningOrderWaitingCorrections,
		StatusFormWaitingCorrections,
		StatusCanceledByManager,
		StatusAdvanceSigningOrder,
		StatusShipmentWaiting,
		StatusManagerChecking,
	},
	StatusPaymentRefundWaiting: {
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
		StatusPaymentRefundProcessing,
	},
	StatusPaymentRefundProcessing: {
		StatusPaymentRefundWaiting,
		StatusPaymentRefundSent,
	},
	StatusPaymentRefundSent: {
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
	},
	// Nest checkTransit: import advance may go PAYMENT_SENT → REPORT_WAITING without postpay overlay.
	StatusPaymentSent: {StatusManagerChecking, StatusReportWaiting, StatusReportAccepted, StatusShipmentWaiting, StatusAdvanceSigningOrder, StatusPaymentRefundWaiting},
	StatusReportWaitingVerification: {
		StatusReportVerification,
		StatusReportAccepted,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusReportWaiting: {
		StatusPaymentSent,
		StatusPaymentReceived,
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
		StatusReportAccepted,
		StatusReportWaitingDiadoc,
		StatusReportWaitingVerification,
	},
	StatusReportWaitingDiadoc: {
		StatusReportWaitingVerification,
		StatusReportWaitingCorrections,
		StatusReportWaiting,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusReportVerification: {
		StatusReportWaitingVerification,
		StatusReportWaitingCorrections,
		StatusFormWaitingCorrections,
		StatusReportAccepted,
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
	},
	StatusReportAccepted: {
		StatusCompleted,
		StatusShipmentWaiting,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusManagerChecking: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusPaymentProcessing,
		StatusPaymentRefundWaiting,
	},
	StatusShipmentWaitingVerification: {
		StatusShipmentVerification,
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
	},
	StatusShipmentVerification: {
		StatusShipmentWaitingVerification,
		StatusShipmentWaitingCorrections,
		StatusFormWaitingCorrections,
		StatusCompleted,
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
	},
	StatusPaymentReceived: {
		StatusPaymentProcessing,
		StatusManagerChecking,
		StatusReportWaiting,
		StatusReportAccepted,
		StatusAdvanceSigningOrder,
		StatusPaymentRefundWaiting,
	},
	StatusPaymentProcessing: {
		StatusPaymentReceived,
		StatusManagerChecking,
		StatusPaymentSent,
		StatusPaymentSentTreasurer,
		StatusSigningOrderAccepted,
		StatusPaymentRefundWaiting,
	},
	StatusAdvanceSigningOrderAccepted: {
		StatusPaymentReceived,
		StatusPaymentProcessing,
		StatusManagerChecking,
		StatusShipmentWaiting,
		StatusPaymentRefundWaiting,
	},
	StatusPaymentSentTreasurer: {StatusSigningOrderTreasurer},
	StatusSigningOrderTreasurer: {
		StatusSigningOrderVerificationTreasurer,
		StatusPaymentSentTreasurer,
	},
	StatusSigningOrderVerificationTreasurer: {
		StatusPaymentSent,
		StatusOrderWaitingCorrectionTreasurer,
		StatusCompleted, // corporate client Nest special-case
	},
	StatusOrderWaitingCorrectionTreasurer: {
		StatusSigningOrderTreasurer,
		StatusSigningOrderVerificationTreasurer,
	},
	StatusReportWaitingCorrections: {
		StatusReportWaitingVerification,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusShipmentWaitingCorrections: {
		StatusShipmentWaitingVerification,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
}

var transitionsImportFormRateOnProviderPostpay = map[Status][]Status{
	StatusPaymentSent: {
		StatusAdvanceSigningOrder,
		StatusAdvanceSigningOrderWaitingVerification,
		StatusAdvanceSigningOrderVerification,
		StatusAdvanceSigningOrderWaitingCorrections,
		StatusAdvanceSigningOrderAccepted,
		StatusPaymentReceived,
	},
}

var transitionsExportForm = map[Status][]Status{
	StatusAdvanceSigningOrderWaitingVerification: {StatusAdvanceSigningOrderVerification},
	StatusAdvanceSigningOrderVerification: {
		StatusAdvanceSigningOrderWaitingVerification,
		StatusAdvanceSigningOrderAccepted,
		StatusAdvanceSigningOrderWaitingCorrections,
		StatusFormWaitingCorrections,
		StatusCanceledByManager,
		StatusCanceledByUser,
	},
	StatusAdvanceSigningOrderAccepted: {
		StatusPaymentProcessing,
		StatusPaymentReceived,
		StatusFormWaitingCorrections,
		StatusPaymentRefundWaiting,
		StatusAdvanceSigningOrderWaitingCorrections,
		StatusCanceledByManager,
	},
	StatusPaymentProcessing: {StatusPaymentSent, StatusPaymentSentTreasurer},
	StatusPaymentReceived: {
		StatusAdvanceSigningOrder,
		StatusPaymentProcessing,
		StatusReportAccepted,
	},
	StatusPaymentSent: {
		StatusReportWaiting,
		StatusReportAccepted,
		StatusManagerChecking,
		StatusPaymentReceived,
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
		StatusPaymentRefundWaiting,
		StatusAdvanceSigningOrder,
		StatusAdvanceSigningOrderWaitingVerification,
		StatusAdvanceSigningOrderVerification,
		StatusAdvanceSigningOrderWaitingCorrections,
		StatusSigningOrderWaitingVerification,
	},
	StatusManagerChecking: {
		StatusCanceledByManager,
		StatusCanceledByUser,
		StatusSigningOrderWaitingCorrections,
		StatusSigningOrderVerification,
		StatusPaymentReceived,
		StatusFormWaitingCorrections,
		StatusSigningOrderAccepted,
		StatusAdvanceSigningOrderAccepted,
	},
	StatusSigningOrderAccepted: {StatusManagerChecking, StatusPaymentReceived},
	StatusPaymentSentTreasurer: {StatusSigningOrderTreasurer},
	StatusSigningOrderTreasurer: {
		StatusSigningOrderVerificationTreasurer,
		StatusPaymentSentTreasurer,
	},
	StatusSigningOrderVerificationTreasurer: {
		StatusPaymentSent,
		StatusOrderWaitingCorrectionTreasurer,
	},
	StatusOrderWaitingCorrectionTreasurer: {
		StatusSigningOrderTreasurer,
		StatusSigningOrderVerificationTreasurer,
	},
}

func AllowedTargets(from Status, direction Direction, rateOnProvider bool) []Status {
	table := clone(transitionsImportForm)
	if direction == DirectionExport {
		table = merge(table, transitionsExportForm)
	}
	if rateOnProvider {
		table = merge(table, transitionsImportFormRateOnProviderPostpay)
	}
	return table[from]
}

func IsAllowedTransition(from, to Status, direction Direction, rateOnProvider bool) bool {
	for _, candidate := range AllowedTargets(from, direction, rateOnProvider) {
		if candidate == to {
			return true
		}
	}
	return false
}

// EffectiveRateOnProvider mirrors Nest platformPostpayMode === POSTPAY_RATE_ON_PP.
func EffectiveRateOnProvider(form Form) bool {
	if form.RateOnProvider {
		return true
	}
	return form.PlatformPostpayMode == PostpayRateOnProvider
}
