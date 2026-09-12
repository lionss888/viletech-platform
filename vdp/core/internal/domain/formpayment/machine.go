package formpayment

import (
	"fmt"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// Command is one lifecycle attempt: role/action AuthZ, optional explicit target, policy overlay.
type Command struct {
	Form        Form
	Action      Action
	Role        domain.Role
	OrgApproved bool
	Target      Status
	Policy      *ProcessPolicySnapshot
}

// Apply runs one lifecycle command: AuthZ by role/action (with optional ProcessPolicySnapshot),
// resolves target status, enforces payment-method and refund §4 guards, then transitions.
// Idempotent when the form is already at the target status.
func Apply(cmd Command) (Form, error) {
	if !RoleMayPerformWithConfig(cmd.Role, cmd.Action, cmd.Policy) {
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
		// Import advance (§10.2): empty or advance. Export: PAY_FROM_EXPORT.
		// Import postpay RATE_ON_PP (§10.3): post_payment only when EffectiveRateOnProvider.
		switch form.PaymentMethod {
		case "", PaymentMethodAdvance, PaymentMethodPayFromExport:
			return nil
		case PaymentMethodPostPayment:
			if EffectiveRateOnProvider(form) {
				return nil
			}
			return apperrors.New(apperrors.ErrCodeConflict, "treasurer confirm for post_payment requires POSTPAY_RATE_ON_PP")
		default:
			return apperrors.New(apperrors.ErrCodeConflict, "treasurer confirm requires advance, post_payment+RATE_ON_PP, or PAY_FROM_EXPORT")
		}
	}
	return nil
}
