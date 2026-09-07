package service

import (
	"context"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ProcessRoleService manages editable role participation in the fixed process.
type ProcessRoleService struct {
	store repository.Store
}

func NewProcessRoleService(store repository.Store) *ProcessRoleService {
	return &ProcessRoleService{store: store}
}

func (s *ProcessRoleService) GetSnapshot(ctx context.Context) (formpayment.ProcessPolicySnapshot, error) {
	snap, err := s.store.GetProcessPolicySnapshot(ctx)
	if err != nil {
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	if len(snap.Roles) == 0 {
		return formpayment.DefaultProcessPolicySnapshot(), nil
	}
	filtered := make([]formpayment.RoleProcessConfig, 0, len(snap.Roles))
	for _, cfg := range snap.Roles {
		if formpayment.IsProcessEligibleRole(cfg.Role) {
			filtered = append(filtered, cfg)
		}
	}
	snap.Roles = filtered
	return snap, nil
}

type ProcessConfigView struct {
	Snapshot           formpayment.ProcessPolicySnapshot `json:"snapshot"`
	Capabilities       []formpayment.Capability         `json:"capabilities"`
	SystemCapabilities []systemcap.Capability           `json:"system_capabilities"`
	Mandatory          []domain.Role                    `json:"mandatory_roles"`
	AdminSystemByRole  map[string][]string              `json:"admin_system_by_role,omitempty"`
}

func (s *ProcessRoleService) GetConfig(ctx context.Context, _ authz.Principal) (ProcessConfigView, error) {
	snap, err := s.GetSnapshot(ctx)
	if err != nil {
		return ProcessConfigView{}, err
	}
	mandatory := make([]domain.Role, 0)
	for _, cfg := range snap.Roles {
		if cfg.Mandatory {
			mandatory = append(mandatory, cfg.Role)
		}
	}
	adminSys := map[string][]string{}
	rootSys, _ := s.store.GetRoleSystemCapabilities(ctx, domain.RoleRoot)
	adminSys[string(domain.RoleRoot)] = rootSys
	return ProcessConfigView{
		Snapshot:           snap,
		Capabilities:       formpayment.AllCapabilities(),
		SystemCapabilities: systemcap.All(),
		Mandatory:          mandatory,
		AdminSystemByRole:  adminSys,
	}, nil
}

type RoleConfigUpdate struct {
	Enabled      *bool                    `json:"enabled"`
	Mandatory    *bool                    `json:"mandatory"`
	Influence    *formpayment.Influence    `json:"influence"`
	Capabilities *[]formpayment.Capability `json:"capabilities"`
}

func (s *ProcessRoleService) UpdateRole(ctx context.Context, principal authz.Principal, role domain.Role, input RoleConfigUpdate) (formpayment.ProcessPolicySnapshot, error) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapProcessRolesManage); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	if !formpayment.IsProcessEligibleRole(role) {
		return formpayment.ProcessPolicySnapshot{}, apperrors.New(apperrors.ErrCodeValidation, "admin roles are not process participants")
	}
	snap, err := s.GetSnapshot(ctx)
	if err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	cfg, ok := snap.ConfigFor(role)
	if !ok {
		return formpayment.ProcessPolicySnapshot{}, apperrors.New(apperrors.ErrCodeNotFound, "role not in process config")
	}
	if input.Enabled != nil {
		cfg.Enabled = *input.Enabled
		// Continuity: leaving the process clears mandatory in the same update (root may re-gate later).
		if !*input.Enabled {
			cfg.Mandatory = false
		}
	}
	if input.Mandatory != nil {
		cfg.Mandatory = *input.Mandatory
		if *input.Mandatory {
			cfg.Enabled = true
		}
	}
	if input.Influence != nil {
		cfg.Influence = *input.Influence
	}
	if input.Capabilities != nil {
		cfg.Capabilities = append([]formpayment.Capability(nil), (*input.Capabilities)...)
	}
	if err := formpayment.ValidateRoleConfigUpdate(role, cfg.Enabled, cfg.Mandatory, cfg.Influence, cfg.Capabilities); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	for i := range snap.Roles {
		if snap.Roles[i].Role == role {
			snap.Roles[i] = cfg
			break
		}
	}
	snap.Version++
	snap.UpdatedAt = time.Now().UTC()
	snap.UpdatedBy = principal.AccountID
	if err := s.store.SaveProcessPolicySnapshot(ctx, snap); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	return snap, nil
}

func (s *ProcessRoleService) UpdatePriorities(ctx context.Context, principal authz.Principal, ordered []domain.Role) (formpayment.ProcessPolicySnapshot, error) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapProcessRolesManage); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	for _, role := range ordered {
		if !formpayment.IsProcessEligibleRole(role) {
			return formpayment.ProcessPolicySnapshot{}, apperrors.New(apperrors.ErrCodeValidation, "admin roles cannot be prioritized in process")
		}
	}
	snap, err := s.GetSnapshot(ctx)
	if err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	next, err := formpayment.ApplyPriorityOrder(snap, ordered)
	if err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	next.Version++
	next.UpdatedAt = time.Now().UTC()
	next.UpdatedBy = principal.AccountID
	if err := s.store.SaveProcessPolicySnapshot(ctx, next); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
	}
	return next, nil
}

type SystemRoleUpdate struct {
	SystemCapabilities []string `json:"system_capabilities"`
}

func (s *ProcessRoleService) UpdateSystemRole(ctx context.Context, principal authz.Principal, role domain.Role, input SystemRoleUpdate) error {
	if err := authz.RequireSystemCapability(principal, systemcap.CapProcessRolesManage); err != nil {
		return err
	}
	if domain.KindForRole(role) != domain.AccountKindAdmin {
		return apperrors.New(apperrors.ErrCodeValidation, "system caps only for admin roles")
	}
	caps := append([]string(nil), input.SystemCapabilities...)
	if role == domain.RoleRoot {
		have := map[string]bool{}
		for _, c := range caps {
			have[c] = true
		}
		for _, locked := range systemcap.LockedForRoot() {
			if !have[string(locked)] {
				caps = append(caps, string(locked))
			}
		}
	}
	for _, c := range caps {
		if !systemcap.IsKnown(systemcap.Capability(c)) {
			return apperrors.New(apperrors.ErrCodeValidation, "unknown system capability: "+c)
		}
	}
	return s.store.SaveRoleSystemCapabilities(ctx, role, caps)
}
