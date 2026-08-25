package authz

import (
	"context"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type Principal struct {
	AccountID      string
	Role           domain.Role
	OrganizationID string
}

type ctxKey string

const principalKey ctxKey = "principal"

func WithPrincipal(ctx context.Context, principal Principal) context.Context {
	return context.WithValue(ctx, principalKey, principal)
}

func FromContext(ctx context.Context) (Principal, error) {
	principal, ok := ctx.Value(principalKey).(Principal)
	if !ok || principal.AccountID == "" {
		return Principal{}, apperrors.ErrUnauthorized
	}
	return principal, nil
}

func RequireRoles(principal Principal, roles ...domain.Role) error {
	for _, role := range roles {
		if principal.Role == role || principal.Role == domain.RoleRoot {
			return nil
		}
	}
	return apperrors.ErrForbidden
}

func CanAccessForm(principal Principal, form formpayment.Form) error {
	if formpayment.CanSeeForm(principal.Role, principal.AccountID, form) {
		return nil
	}
	return apperrors.ErrForbidden
}
