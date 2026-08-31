package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
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

func (s *AccountService) Me(ctx context.Context, principal authz.Principal) (domain.Account, error) {
	return s.store.AccountByID(ctx, principal.AccountID)
}

func (s *AccountService) GetByID(ctx context.Context, principal authz.Principal, id string) (domain.Account, error) {
	switch principal.Role {
	case domain.RoleRoot, domain.RoleManager, domain.RoleTreasurer, domain.RoleComplianceOfficer,
		domain.RoleInternalComplianceOfficer, domain.RoleProvider, domain.RoleSeniorProvider:
		return s.store.AccountByID(ctx, id)
	case domain.RoleUser:
		if principal.AccountID != id {
			return domain.Account{}, apperrors.ErrForbidden
		}
		return s.store.AccountByID(ctx, id)
	default:
		return domain.Account{}, apperrors.ErrForbidden
	}
}

type AccountUpdate struct {
	FullName string
	Phone    string
	Lang     string
	Blocked  *bool
	Active   *bool
	Role     domain.Role
	Password string
}

func (s *AccountService) UpdateSelf(ctx context.Context, principal authz.Principal, input AccountUpdate) (domain.Account, error) {
	account, err := s.store.AccountByID(ctx, principal.AccountID)
	if err != nil {
		return domain.Account{}, err
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
	return account, s.store.SaveAccount(ctx, account)
}

func (s *AccountService) UpdateByAdmin(ctx context.Context, principal authz.Principal, id string, input AccountUpdate) (domain.Account, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot); err != nil {
		return domain.Account{}, err
	}
	account, err := s.store.AccountByID(ctx, id)
	if err != nil {
		return domain.Account{}, err
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
	if input.Password != "" {
		account.PasswordHash = HashPassword(input.Password)
	}
	return account, s.store.SaveAccount(ctx, account)
}

func (s *AccountService) List(ctx context.Context, principal authz.Principal) ([]domain.Account, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return nil, err
	}
	return s.store.ListAccounts(ctx)
}

func (s *AccountService) Count(ctx context.Context, principal authz.Principal) (int, error) {
	items, err := s.List(ctx, principal)
	if err != nil {
		return 0, err
	}
	return len(items), nil
}

func (s *AccountService) CreateAdmin(ctx context.Context, principal authz.Principal, email, password string, role domain.Role) (domain.Account, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot); err != nil {
		return domain.Account{}, err
	}
	if role == "" {
		role = domain.RoleManager
	}
	if _, err := s.store.AccountByEmail(ctx, email); err == nil {
		return domain.Account{}, apperrors.New(apperrors.ErrCodeConflict, "email exists")
	}
	account := domain.Account{
		ID:           s.newID(),
		Email:        email,
		PasswordHash: HashPassword(password),
		Role:         role,
		Active:       true,
	}
	return account, s.store.SaveAccount(ctx, account)
}
