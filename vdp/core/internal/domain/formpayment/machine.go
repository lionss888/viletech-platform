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
	if !IsAllowedTransition(cmd.Form.Status, target, cmd.Form.Direction, cmd.Form.RateOnProvider) {
		return Form{}, apperrors.New(
			apperrors.ErrCodeConflict,
			fmt.Sprintf("transition %s -> %s is not allowed", cmd.Form.Status, target),
		)
	}
	next := cmd.Form
	next.PrevStatus = cmd.Form.Status
	next.Status = target
	return next, nil
}
