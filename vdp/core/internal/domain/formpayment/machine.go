package formpayment

import (
	"fmt"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type Command struct {
	Form        Form
	Action      Action
	Role        domain.Role
	OrgApproved bool
	Target      Status
}

func Apply(cmd Command) (Form, error) {
	if !RoleMayPerform(cmd.Role, cmd.Action) {
		return Form{}, apperrors.New(apperrors.ErrCodeForbidden, "role is not allowed to perform this action")
	}
	target := cmd.Target
	var err error
	if target == "" {
		target, err = TargetStatus(cmd.Form, cmd.Action, cmd.OrgApproved)
		if err != nil {
			return Form{}, err
		}
	}
	if cmd.Form.Status == target {
		return cmd.Form, nil
	}
	if err := guardPaymentMethod(cmd.Form, cmd.Action); err != nil {
		return Form{}, err
	}
	// §4 invariant: no final CANCELED_* while client funds are held unrefunded.
	if isCancelStatus(target) && cmd.Form.HasUnrefundedFunds() {
		return Form{}, apperrors.New(
			apperrors.ErrCodeConflict,
			"cannot finalize cancel while funds are unrefunded; initiate refund first",
		)
	}
	if !IsAllowedTransition(cmd.Form.Status, target, cmd.Form.Direction, EffectiveRateOnProvider(cmd.Form)) {
		if !isCancelStatus(target) {
			return Form{}, apperrors.New(
				apperrors.ErrCodeConflict,
				fmt.Sprintf("transition %s -> %s is not allowed", cmd.Form.Status, target),
			)
		}
	}
	next := cmd.Form
	next.PrevStatus = cmd.Form.Status
	next.Status = target
	switch target {
	case StatusPaymentReceived, StatusPaymentSent, StatusPaymentProcessing, StatusPaymentSentTreasurer:
		next.MarkFundsReceived()
	case StatusPaymentRefundSent:
		next.MarkFundsRefunded("")
	}
	return next, nil
}

func isCancelStatus(s Status) bool {
	switch s {
	case StatusCanceledByUser, StatusCanceledByManager, StatusCanceledByComplianceOfficer, StatusCanceledByInternalComplianceOfficer:
		return true
	default:
		return false
	}
}

func guardPaymentMethod(form Form, action Action) error {
	switch action {
	case ActionTreasurerConfirm:
		if form.PaymentMethod != PaymentMethodPayFromExport && form.PlatformPostpayMode == "" {
			// Nest: treasurer confirm is for PAY_FROM_EXPORT / postpay export path.
			// Allow when payment method unset in early MVP forms; block only explicit mismatch.
			return nil
		}
		if form.PaymentMethod != "" && form.PaymentMethod != PaymentMethodPayFromExport {
			return apperrors.New(apperrors.ErrCodeConflict, "treasurer confirm requires PAY_FROM_EXPORT")
		}
	}
	return nil
}
