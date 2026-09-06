package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type AccountService struct {
	store repository.Store
	newID func() string
}

func NewAccountService(store repository.Store) *AccountService {
	return &AccountService{
		store: store,
		newID: func() string {
			buf := make([]byte, 16)
			_, _ = rand.Read(buf)
			return hex.EncodeToString(buf)
		},
	}
}

func (s *AccountService) Me(ctx context.Context, principal authz.Principal) (map[string]any, error) {
	account, err := s.store.AccountByID(ctx, principal.AccountID)
	if err != nil {
		return nil, err
	}
	return s.publicWithEffective(ctx, account)
}

func (s *AccountService) GetByID(ctx context.Context, principal authz.Principal, id string) (map[string]any, error) {
	if principal.AccountID != id {
		if err := authz.RequireAnySystemCapability(principal, systemcap.CapAccountsManage, systemcap.CapFormsAdmin); err != nil {
			if err2 := authz.AuthorizeRoles(principal, 
				domain.RoleManager, domain.RoleTreasurer, domain.RoleComplianceOfficer,
				domain.RoleInternalComplianceOfficer, domain.RoleProvider, domain.RoleSeniorProvider,
			); err2 != nil {
				return nil, err2
			}
		}
	}
	account, err := s.store.AccountByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.publicWithEffective(ctx, account)
}

type AccountUpdate struct {
	FullName               string             `json:"full_name"`
	Phone                  string             `json:"phone"`
	Lang                   string             `json:"lang"`
	Blocked                *bool              `json:"blocked"`
	Active                 *bool              `json:"active"`
	Role                   domain.Role        `json:"role"`
	AccountKind            domain.AccountKind `json:"account_kind"`
	Password               string             `json:"password"`
	BusinessCapOverrides   *[]string          `json:"business_cap_overrides"`
	SystemCapOverrides     *[]string          `json:"system_cap_overrides"`
	ClearBusinessOverrides bool               `json:"clear_business_overrides"`
	ClearSystemOverrides   bool               `json:"clear_system_overrides"`
}

func (s *AccountService) UpdateSelf(ctx context.Context, principal authz.Principal, input AccountUpdate) (map[string]any, error) {
	account, err := s.store.AccountByID(ctx, principal.AccountID)
	if err != nil {
		return nil, err
	}
	if input.FullName != "" {
		account.FullName = input.FullName
	}
	if input.Phone != "" {
		account.Phone = input.Phone
	}
	if input.Lang != "" {
		account.Lang = input.Lang
	}
	if err := s.store.SaveAccount(ctx, account); err != nil {
		return nil, err
	}
	return s.publicWithEffective(ctx, account)
}

func (s *AccountService) UpdateByAdmin(ctx context.Context, principal authz.Principal, id string, input AccountUpdate) (map[string]any, error) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapAccountsManage); err != nil {
		return nil, err
	}
	account, err := s.store.AccountByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if input.FullName != "" {
		account.FullName = input.FullName
	}
	if input.Phone != "" {
		account.Phone = input.Phone
	}
	if input.Lang != "" {
		account.Lang = input.Lang
	}
	if input.Blocked != nil {
		account.Blocked = *input.Blocked
	}
	if input.Active != nil {
		account.Active = *input.Active
	}
	if input.Role != "" {
		account.Role = input.Role
	}
	if input.AccountKind != "" {
		account.AccountKind = input.AccountKind
	} else if input.Role != "" {
		account.AccountKind = domain.KindForRole(account.Role)
	}
	if !domain.RoleAllowedForKind(account.EffectiveKind(), account.Role) {
		return nil, apperrors.New(apperrors.ErrCodeValidation, "role not allowed for account kind")
	}
	if input.Password != "" {
		account.PasswordHash = HashPassword(input.Password)
	}
	if input.ClearBusinessOverrides {
		account.BusinessCapOverrides = nil
	} else if input.BusinessCapOverrides != nil {
		account.BusinessCapOverrides = input.BusinessCapOverrides
	}
	if input.ClearSystemOverrides {
		account.SystemCapOverrides = nil
	} else if input.SystemCapOverrides != nil {
		if account.EffectiveKind() != domain.AccountKindAdmin && len(*input.SystemCapOverrides) > 0 {
			return nil, apperrors.New(apperrors.ErrCodeValidation, "user kind cannot have system capabilities")
		}
		account.SystemCapOverrides = input.SystemCapOverrides
	}
	if account.Role == domain.RoleRoot && account.SystemCapOverrides != nil {
		ensured := systemcap.EnsureLockedRoot(toSystemCaps(*account.SystemCapOverrides))
		list := fromSystemCaps(ensured)
		account.SystemCapOverrides = &list
	}
	if err := s.store.SaveAccount(ctx, account); err != nil {
		return nil, err
	}
	return s.publicWithEffective(ctx, account)
}

func (s *AccountService) List(ctx context.Context, principal authz.Principal) ([]map[string]any, error) {
	if err := authz.RequireAnySystemCapability(principal, systemcap.CapAccountsManage, systemcap.CapFormsAdmin); err != nil {
		if err2 := authz.RequireBusinessCapability(principal, formpayment.CapManagerOps); err2 != nil {
			return nil, err2
		}
	}
	items, err := s.store.ListAccounts(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(items))
	for _, a := range items {
		pub, err := s.publicWithEffective(ctx, a)
		if err != nil {
			return nil, err
		}
		out = append(out, pub)
	}
	return out, nil
}

func (s *AccountService) Count(ctx context.Context, principal authz.Principal) (int, error) {
	items, err := s.List(ctx, principal)
	if err != nil {
		return 0, err
	}
	return len(items), nil
}

type AccountCreateInput struct {
	Email                string              `json:"email"`
	Password             string              `json:"password"`
	Role                 domain.Role         `json:"role"`
	AccountKind          domain.AccountKind  `json:"account_kind"`
	FullName             string              `json:"full_name"`
	BusinessCapOverrides *[]string           `json:"business_cap_overrides"`
	SystemCapOverrides   *[]string           `json:"system_cap_overrides"`
}

func (s *AccountService) CreateAdmin(ctx context.Context, principal authz.Principal, input AccountCreateInput) (map[string]any, error) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapAccountsManage); err != nil {
		return nil, err
	}
	role := input.Role
	if role == "" {
		role = domain.RoleManager
	}
	kind := input.AccountKind
	if kind == "" {
		kind = domain.KindForRole(role)
	}
	if !domain.RoleAllowedForKind(kind, role) {
		return nil, apperrors.New(apperrors.ErrCodeValidation, "role not allowed for account kind")
	}
	if kind != domain.AccountKindAdmin && input.SystemCapOverrides != nil && len(*input.SystemCapOverrides) > 0 {
		return nil, apperrors.New(apperrors.ErrCodeValidation, "user kind cannot have system capabilities")
	}
	if _, err := s.store.AccountByEmail(ctx, input.Email); err == nil {
		return nil, apperrors.New(apperrors.ErrCodeConflict, "email exists")
	}
	account := domain.Account{
		ID:                   s.newID(),
		Email:                input.Email,
		PasswordHash:         HashPassword(input.Password),
		Role:                 role,
		AccountKind:          kind,
		FullName:             input.FullName,
		Active:               true,
		BusinessCapOverrides: input.BusinessCapOverrides,
		SystemCapOverrides:   input.SystemCapOverrides,
	}
	if role == domain.RoleRoot && account.SystemCapOverrides != nil {
		ensured := systemcap.EnsureLockedRoot(toSystemCaps(*account.SystemCapOverrides))
		list := fromSystemCaps(ensured)
		account.SystemCapOverrides = &list
	}
	if err := s.store.SaveAccount(ctx, account); err != nil {
		return nil, err
	}
	return s.publicWithEffective(ctx, account)
}

func (s *AccountService) publicWithEffective(ctx context.Context, account domain.Account) (map[string]any, error) {
	snap, _ := s.store.GetProcessPolicySnapshot(ctx)
	sysRaw, _ := s.store.GetRoleSystemCapabilities(ctx, account.Role)
	sysTemplate := toSystemCaps(sysRaw)
	principal, err := authz.PrincipalFromAccount(account, snap, sysTemplate)
	if err != nil {
		return nil, err
	}
	out := account.Public()
	biz := make([]string, 0, len(principal.Caps.Business))
	for _, c := range principal.Caps.Business {
		biz = append(biz, string(c))
	}
	sys := make([]string, 0, len(principal.Caps.System))
	for _, c := range principal.Caps.System {
		sys = append(sys, string(c))
	}
	out["effective_capabilities"] = map[string]any{
		"business":  biz,
		"system":    sys,
		"influence": string(principal.Caps.Influence),
	}
	return out, nil
}

func toSystemCaps(raw []string) []systemcap.Capability {
	out := make([]systemcap.Capability, 0, len(raw))
	for _, c := range raw {
		out = append(out, systemcap.Capability(c))
	}
	return out
}

func fromSystemCaps(caps []systemcap.Capability) []string {
	out := make([]string, 0, len(caps))
	for _, c := range caps {
		out = append(out, string(c))
	}
	return out
}
