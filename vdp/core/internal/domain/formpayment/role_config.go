package formpayment

import (
	"sort"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// Influence describes how a role may affect a form in the fixed process.
type Influence string

const (
	InfluenceActor    Influence = "actor"
	InfluenceObserver Influence = "observer"
	InfluenceNone     Influence = "none"
)

// RoleProcessConfig is root-editable participation of a role in the fixed process.
type RoleProcessConfig struct {
	Role         domain.Role  `json:"role"`
	Enabled      bool         `json:"enabled"`
	Mandatory    bool         `json:"mandatory"`
	Priority     int          `json:"priority"`
	Influence    Influence    `json:"influence"`
	Capabilities []Capability `json:"capabilities"`
}

// ProcessPolicySnapshot is the versioned role layer over the fixed status machine.
type ProcessPolicySnapshot struct {
	Version   int                 `json:"version"`
	Roles     []RoleProcessConfig `json:"roles"`
	UpdatedAt time.Time           `json:"updated_at,omitempty"`
	UpdatedBy string              `json:"updated_by,omitempty"`
}

func (s ProcessPolicySnapshot) ConfigFor(role domain.Role) (RoleProcessConfig, bool) {
	for _, cfg := range s.Roles {
		if cfg.Role == role {
			return cfg, true
		}
	}
	return RoleProcessConfig{}, false
}

func (s ProcessPolicySnapshot) SortedByPriority() []RoleProcessConfig {
	out := append([]RoleProcessConfig(nil), s.Roles...)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Priority == out[j].Priority {
			return string(out[i].Role) < string(out[j].Role)
		}
		return out[i].Priority < out[j].Priority
	})
	return out
}

func (c RoleProcessConfig) HasCapability(cap Capability) bool {
	for _, item := range c.Capabilities {
		if item == cap {
			return true
		}
	}
	return false
}

// Removable is true when the role is not marked mandatory in process config.
func (c RoleProcessConfig) Removable() bool {
	return !c.Mandatory
}

// DefaultProcessPolicySnapshot is pilot participation: U/M/P spine mandatory; ICO/ECO off.
// Root/admin is excluded: not a business-process participant.
func DefaultProcessPolicySnapshot() ProcessPolicySnapshot {
	return ProcessPolicySnapshot{
		Version: 1,
		Roles: []RoleProcessConfig{
			{Role: domain.RoleUser, Enabled: true, Mandatory: true, Priority: 10, Influence: InfluenceActor, Capabilities: defaultCapsUser()},
			{Role: domain.RoleSales, Enabled: false, Mandatory: false, Priority: 15, Influence: InfluenceObserver, Capabilities: []Capability{CapFormView, CapSalesAttribution}},
			{Role: domain.RoleInternalComplianceOfficer, Enabled: false, Mandatory: false, Priority: 20, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapOrgCompliance}},
			{Role: domain.RoleComplianceOfficer, Enabled: false, Mandatory: false, Priority: 30, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapFormCompliance}},
			{Role: domain.RoleManager, Enabled: true, Mandatory: true, Priority: 40, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapFormRecognize, CapManagerOps, CapManagerPayment, CapProviderPayment}},
			{Role: domain.RoleTreasurer, Enabled: true, Mandatory: false, Priority: 45, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapManagerOps, CapManagerPayment, CapTreasurerOps}},
			{Role: domain.RoleProvider, Enabled: true, Mandatory: true, Priority: 50, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapManagerPayment, CapProviderPayment}},
			{Role: domain.RoleSeniorProvider, Enabled: true, Mandatory: true, Priority: 55, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapManagerPayment, CapProviderPayment}},
			{Role: domain.RoleViewer, Enabled: false, Mandatory: false, Priority: 60, Influence: InfluenceObserver, Capabilities: []Capability{CapFormView}},
			{Role: domain.RoleOneC, Enabled: true, Mandatory: false, Priority: 70, Influence: InfluenceActor, Capabilities: []Capability{CapInternalCallback}},
			{Role: domain.RoleBank, Enabled: true, Mandatory: false, Priority: 80, Influence: InfluenceActor, Capabilities: []Capability{CapFormView, CapFormSubmit, CapBankChannel}},
		},
	}
}

// DefaultTemplateForRole returns process template for a typed role (empty for admin-only roles).
func DefaultTemplateForRole(role domain.Role) (RoleProcessConfig, bool) {
	snap := DefaultProcessPolicySnapshot()
	return snap.ConfigFor(role)
}

// AdminBusinessCaps are business capabilities granted to platform admin for union CTA.
func AdminBusinessCaps() []Capability {
	return AllCapabilities()
}

func defaultCapsUser() []Capability {
	return []Capability{CapFormView, CapFormSubmit, CapFormCancelUser, CapFormRecognize, CapUserDocs}
}

// RoleMayPerformWithConfig authorizes action using snapshot; nil/empty falls back to RolesForAction.
// Platform admin (root) is not a process role: authorized via AdminBusinessCaps when role is root.
// When a slot actor is disabled in config, manager (manager.ops) may advance that slot (continuity spine).
func RoleMayPerformWithConfig(role domain.Role, action Action, snap *ProcessPolicySnapshot) bool {
	if role == domain.RoleRoot {
		cap := CapabilityForAction(action)
		if cap == "" {
			return false
		}
		for _, c := range AdminBusinessCaps() {
			if c == cap {
				return true
			}
		}
		return false
	}
	if snap == nil || len(snap.Roles) == 0 {
		return RoleMayPerformLegacy(role, action)
	}
	cfg, ok := snap.ConfigFor(role)
	if ok && cfg.Enabled && cfg.Influence == InfluenceActor {
		cap := CapabilityForAction(action)
		if cap != "" && cfg.HasCapability(cap) {
			return true
		}
	}
	if canAdvanceDisabledSlot(role, action, snap) {
		return true
	}
	return false
}

// slotActorForCapability maps a capability to its primary process-slot actor.
func slotActorForCapability(cap Capability) domain.Role {
	switch cap {
	case CapOrgCompliance:
		return domain.RoleInternalComplianceOfficer
	case CapFormCompliance:
		return domain.RoleComplianceOfficer
	default:
		return ""
	}
}

// canAdvanceDisabledSlot allows manager.ops when the dedicated slot actor is disabled.
func canAdvanceDisabledSlot(role domain.Role, action Action, snap *ProcessPolicySnapshot) bool {
	cap := CapabilityForAction(action)
	slot := slotActorForCapability(cap)
	if slot == "" {
		return false
	}
	slotCfg, ok := snap.ConfigFor(slot)
	if !ok || slotCfg.Enabled {
		return false
	}
	actor, ok := snap.ConfigFor(role)
	if !ok || !actor.Enabled || actor.Influence != InfluenceActor {
		return false
	}
	return actor.HasCapability(CapManagerOps)
}

// RoleMayPerformLegacy is the hard-coded matrix (kept for parity tests and empty snapshot).
func RoleMayPerformLegacy(role domain.Role, action Action) bool {
	if role == domain.RoleRoot {
		cap := CapabilityForAction(action)
		if cap == "" {
			return false
		}
		for _, c := range AdminBusinessCaps() {
			if c == cap {
				return true
			}
		}
		return false
	}
	for _, allowed := range RolesForAction(action) {
		if allowed == role {
			return true
		}
	}
	return false
}

// ValidateRoleConfigUpdate checks capabilities and mandatory disable rules.
func ValidateRoleConfigUpdate(role domain.Role, enabled bool, mandatory bool, influence Influence, caps []Capability) error {
	if !IsProcessEligibleRole(role) {
		return apperrors.New(apperrors.ErrCodeValidation, "admin roles are not process participants")
	}
	if mandatory && !enabled {
		return apperrors.New(apperrors.ErrCodeValidation, "cannot disable mandatory process role")
	}
	if influence != InfluenceActor && influence != InfluenceObserver && influence != InfluenceNone {
		return apperrors.New(apperrors.ErrCodeValidation, "invalid influence")
	}
	if influence == InfluenceObserver {
		for _, c := range caps {
			if TransitionCapability(c) {
				return apperrors.New(apperrors.ErrCodeValidation, "observer cannot have transition capabilities")
			}
		}
	}
	for _, c := range caps {
		if !IsKnownCapability(c) {
			return apperrors.New(apperrors.ErrCodeValidation, "unknown capability: "+string(c))
		}
	}
	if enabled && influence == InfluenceActor {
		hasSubmit := false
		for _, c := range caps {
			if c == CapFormSubmit {
				hasSubmit = true
				break
			}
		}
		_ = hasSubmit
	}
	return nil
}

// ApplyPriorityOrder rewrites priorities from an ordered role list (1-based steps of 10).
func ApplyPriorityOrder(snap ProcessPolicySnapshot, ordered []domain.Role) (ProcessPolicySnapshot, error) {
	if len(ordered) == 0 {
		return snap, apperrors.New(apperrors.ErrCodeValidation, "priorities list is empty")
	}
	seen := map[domain.Role]bool{}
	for i, role := range ordered {
		if seen[role] {
			return snap, apperrors.New(apperrors.ErrCodeValidation, "duplicate role in priorities")
		}
		seen[role] = true
		found := false
		for j := range snap.Roles {
			if snap.Roles[j].Role == role {
				snap.Roles[j].Priority = (i + 1) * 10
				found = true
				break
			}
		}
		if !found {
			return snap, apperrors.New(apperrors.ErrCodeValidation, "unknown role in priorities: "+string(role))
		}
	}
	return snap, nil
}
