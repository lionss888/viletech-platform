package authz

import (
	"context"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/effective"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type Principal struct {
	AccountID      string
	Role           domain.Role
	OrganizationID string
	AccountKind    domain.AccountKind
	Caps           effective.Caps
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

// RequireBusinessCapability requires a form-process business capability.
func RequireBusinessCapability(principal Principal, cap formpayment.Capability) error {
	p := ensureCaps(principal)
	if p.Caps.HasBusiness(cap) || p.Caps.HasSystem(systemcap.CapFormsAdmin) {
		return nil
	}
	return apperrors.ErrForbidden
}

// RequireAnyBusinessCapability requires at least one of the listed business capabilities.
func RequireAnyBusinessCapability(principal Principal, caps ...formpayment.Capability) error {
	p := ensureCaps(principal)
	if p.Caps.HasAnyBusiness(caps...) || p.Caps.HasSystem(systemcap.CapFormsAdmin) {
		return nil
	}
	return apperrors.ErrForbidden
}

// RequireSystemCapability requires a platform system capability.
func RequireSystemCapability(principal Principal, cap systemcap.Capability) error {
	p := ensureCaps(principal)
	if p.Caps.HasSystem(cap) || p.Caps.HasSystem(systemcap.CapSystemAdmin) {
		return nil
	}
	return apperrors.ErrForbidden
}

// RequireAnySystemCapability requires at least one system capability.
func RequireAnySystemCapability(principal Principal, caps ...systemcap.Capability) error {
	p := ensureCaps(principal)
	if p.Caps.HasAnySystem(caps...) || p.Caps.HasSystem(systemcap.CapSystemAdmin) {
		return nil
	}
	return apperrors.ErrForbidden
}

func CanAccessForm(principal Principal, form formpayment.Form) error {
	if formpayment.CanSeeForm(principal.Role, principal.AccountID, form) {
		return nil
	}
	if ensureCaps(principal).Caps.HasSystem(systemcap.CapFormsAdmin) {
		return nil
	}
	return apperrors.ErrForbidden
}

// ensureCaps fills Caps from Role when tests construct bare Principal{Role:...}.
func ensureCaps(principal Principal) Principal {
	if len(principal.Caps.Business) > 0 || len(principal.Caps.System) > 0 {
		return principal
	}
	acc := domain.Account{
		ID:             principal.AccountID,
		Role:           principal.Role,
		OrganizationID: principal.OrganizationID,
		AccountKind:    principal.AccountKind,
	}
	if acc.AccountKind == "" {
		acc.AccountKind = domain.KindForRole(acc.Role)
	}
	p, err := PrincipalFromAccount(acc, formpayment.DefaultProcessPolicySnapshot(), effective.DefaultAdminSystemCaps())
	if err != nil {
		return principal
	}
	p.AccountID = principal.AccountID
	p.OrganizationID = principal.OrganizationID
	return p
}

// PrincipalFromAccount builds Principal with effective caps from account + process template + system template.
func PrincipalFromAccount(
	account domain.Account,
	processSnap formpayment.ProcessPolicySnapshot,
	systemTemplate []systemcap.Capability,
) (Principal, error) {
	kind := account.EffectiveKind()
	tpl, ok := processSnap.ConfigFor(account.Role)
	if !ok {
		if account.Role == domain.RoleRoot {
			tpl = formpayment.RoleProcessConfig{
				Role: domain.RoleRoot, Enabled: true, Influence: formpayment.InfluenceActor,
				Capabilities: formpayment.AdminBusinessCaps(),
			}
		} else if def, dok := formpayment.DefaultTemplateForRole(account.Role); dok {
			tpl = def
		}
	}
	var bizOverride []formpayment.Capability
	if account.BusinessCapOverrides != nil {
		bizOverride = make([]formpayment.Capability, 0, len(*account.BusinessCapOverrides))
		for _, c := range *account.BusinessCapOverrides {
			bizOverride = append(bizOverride, formpayment.Capability(c))
		}
	}
	var sysOverride []systemcap.Capability
	if account.SystemCapOverrides != nil {
		sysOverride = make([]systemcap.Capability, 0, len(*account.SystemCapOverrides))
		for _, c := range *account.SystemCapOverrides {
			sysOverride = append(sysOverride, systemcap.Capability(c))
		}
	}
	caps, err := effective.Resolve(kind, account.Role, tpl, systemTemplate, bizOverride, sysOverride)
	if err != nil {
		return Principal{}, err
	}
	return Principal{
		AccountID:      account.ID,
		Role:           account.Role,
		OrganizationID: account.OrganizationID,
		AccountKind:    kind,
		Caps:           caps,
	}, nil
}

// CapsForRoles returns primary (distinctive) business capabilities for typed roles.
func CapsForRoles(roles ...domain.Role) []formpayment.Capability {
	seen := map[formpayment.Capability]bool{}
	out := make([]formpayment.Capability, 0)
	for _, role := range roles {
		if role == domain.RoleRoot {
			continue
		}
		cap := PrimaryCapForRole(role)
		if cap == "" || seen[cap] {
			continue
		}
		seen[cap] = true
		out = append(out, cap)
	}
	return out
}

// PrimaryCapForRole is the distinctive capability used for gateway AuthorizeRoles checks.
func PrimaryCapForRole(role domain.Role) formpayment.Capability {
	switch role {
	case domain.RoleUser:
		return formpayment.CapFormSubmit
	case domain.RoleBank:
		return formpayment.CapBankChannel
	case domain.RoleManager:
		return formpayment.CapManagerOps
	case domain.RoleInternalComplianceOfficer:
		return formpayment.CapOrgCompliance
	case domain.RoleComplianceOfficer:
		return formpayment.CapFormCompliance
	case domain.RoleProvider, domain.RoleSeniorProvider:
		return formpayment.CapProviderPayment
	case domain.RoleTreasurer:
		return formpayment.CapTreasurerOps
	case domain.RoleOneC:
		return formpayment.CapInternalCallback
	case domain.RoleSales:
		return formpayment.CapSalesAttribution
	case domain.RoleViewer:
		return formpayment.CapFormView
	default:
		return ""
	}
}

// AuthorizeRoles replaces legacy RequireRoles: process roles via primary business caps;
// RoleRoot via forms.admin / system.admin.
func AuthorizeRoles(principal Principal, roles ...domain.Role) error {
	p := ensureCaps(principal)
	bizRoles := make([]domain.Role, 0, len(roles))
	for _, role := range roles {
		if role == domain.RoleRoot {
			if p.Caps.HasSystem(systemcap.CapFormsAdmin) || p.Caps.HasSystem(systemcap.CapSystemAdmin) {
				return nil
			}
			continue
		}
		bizRoles = append(bizRoles, role)
	}
	caps := CapsForRoles(bizRoles...)
	if len(caps) == 0 {
		return apperrors.ErrForbidden
	}
	return RequireAnyBusinessCapability(p, caps...)
}
