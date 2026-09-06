package service

import (
	"context"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ProcessRoleService manages root-editable role participation in the fixed process.
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
	return snap, nil
}

type ProcessConfigView struct {
	Snapshot     formpayment.ProcessPolicySnapshot `json:"snapshot"`
	Capabilities []formpayment.Capability         `json:"capabilities"`
	Mandatory    []domain.Role                    `json:"mandatory_roles"`
}

func (s *ProcessRoleService) GetConfig(ctx context.Context, _ authz.Principal) (ProcessConfigView, error) {
	snap, err := s.GetSnapshot(ctx)
	if err != nil {
		return ProcessConfigView{}, err
	}
	mandatory := make([]domain.Role, 0)
	for _, role := range []domain.Role{
		domain.RoleUser, domain.RoleInternalComplianceOfficer, domain.RoleComplianceOfficer,
		domain.RoleManager, domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleRoot,
	} {
		if formpayment.IsMandatoryProcessRole(role) {
			mandatory = append(mandatory, role)
		}
	}
	return ProcessConfigView{
		Snapshot:     snap,
		Capabilities: formpayment.AllCapabilities(),
		Mandatory:    mandatory,
	}, nil
}

type RoleConfigUpdate struct {
	Enabled      *bool                     `json:"enabled"`
	Influence    *formpayment.Influence     `json:"influence"`
	Capabilities *[]formpayment.Capability  `json:"capabilities"`
}

func (s *ProcessRoleService) UpdateRole(ctx context.Context, principal authz.Principal, role domain.Role, input RoleConfigUpdate) (formpayment.ProcessPolicySnapshot, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
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
	}
	if input.Influence != nil {
		cfg.Influence = *input.Influence
	}
	if input.Capabilities != nil {
		cfg.Capabilities = append([]formpayment.Capability(nil), (*input.Capabilities)...)
	}
	if err := formpayment.ValidateRoleConfigUpdate(role, cfg.Enabled, cfg.Influence, cfg.Capabilities); err != nil {
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
	if err := authz.RequireRoles(principal, domain.RoleRoot); err != nil {
		return formpayment.ProcessPolicySnapshot{}, err
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
