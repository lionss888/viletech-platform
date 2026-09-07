package effective

import (
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// Caps is the resolved authorization set for a principal.
type Caps struct {
	Kind       domain.AccountKind
	Role       domain.Role
	Influence  formpayment.Influence
	Business   []formpayment.Capability
	System     []systemcap.Capability
	FromOverride bool
}

func (c Caps) HasBusiness(cap formpayment.Capability) bool {
	for _, item := range c.Business {
		if item == cap {
			return true
		}
	}
	return false
}

func (c Caps) HasSystem(cap systemcap.Capability) bool {
	for _, item := range c.System {
		if item == cap {
			return true
		}
	}
	return false
}

func (c Caps) HasAnyBusiness(caps ...formpayment.Capability) bool {
	for _, cap := range caps {
		if c.HasBusiness(cap) {
			return true
		}
	}
	return false
}

func (c Caps) HasAnySystem(caps ...systemcap.Capability) bool {
	for _, cap := range caps {
		if c.HasSystem(cap) {
			return true
		}
	}
	return false
}

// Resolve merges role template (A) with optional account overrides (B).
// businessOverride / systemOverride nil means "use template only".
func Resolve(
	kind domain.AccountKind,
	role domain.Role,
	template formpayment.RoleProcessConfig,
	adminSystem []systemcap.Capability,
	businessOverride []formpayment.Capability,
	systemOverride []systemcap.Capability,
) (Caps, error) {
	if !domain.RoleAllowedForKind(kind, role) {
		return Caps{}, apperrors.New(apperrors.ErrCodeValidation, "role not allowed for account kind")
	}
	out := Caps{
		Kind:      kind,
		Role:      role,
		Influence: formpayment.InfluenceActor,
	}
	if template.Role != "" {
		out.Influence = template.Influence
		if !template.Enabled && kind == domain.AccountKindUser {
			out.Influence = formpayment.InfluenceNone
		}
	}
	business := append([]formpayment.Capability(nil), template.Capabilities...)
	if businessOverride != nil {
		out.FromOverride = true
		business = append([]formpayment.Capability(nil), businessOverride...)
	}
	system := append([]systemcap.Capability(nil), adminSystem...)
	if kind == domain.AccountKindAdmin {
		if len(system) == 0 {
			system = systemcap.All()
		}
		if systemOverride != nil {
			out.FromOverride = true
			system = append([]systemcap.Capability(nil), systemOverride...)
		}
		if role == domain.RoleRoot {
			system = systemcap.EnsureLockedRoot(system)
		}
	} else {
		if systemOverride != nil && len(systemOverride) > 0 {
			return Caps{}, apperrors.New(apperrors.ErrCodeValidation, "user kind cannot have system capabilities")
		}
		system = nil
	}
	for _, c := range business {
		if !formpayment.IsKnownCapability(c) {
			return Caps{}, apperrors.New(apperrors.ErrCodeValidation, "unknown business capability: "+string(c))
		}
	}
	for _, c := range system {
		if !systemcap.IsKnown(c) {
			return Caps{}, apperrors.New(apperrors.ErrCodeValidation, "unknown system capability: "+string(c))
		}
	}
	out.Business = business
	out.System = system
	return out, nil
}

// DefaultAdminSystemCaps is the root/admin template for system rights.
func DefaultAdminSystemCaps() []systemcap.Capability {
	return systemcap.All()
}

// MayPerformAction checks form transition using effective business caps and influence.
func MayPerformAction(caps Caps, action formpayment.Action) bool {
	if caps.Influence == formpayment.InfluenceNone || caps.Influence == formpayment.InfluenceObserver {
		return false
	}
	cap := formpayment.CapabilityForAction(action)
	if cap == "" {
		return false
	}
	if caps.HasBusiness(cap) {
		return true
	}
	// Admin with forms.admin may perform any form action (union CTA).
	return caps.HasSystem(systemcap.CapFormsAdmin)
}
