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

type OrganizationService struct {
	store repository.Store
	newID func() string
}

func NewOrganizationService(store repository.Store) *OrganizationService {
	return &OrganizationService{
		store: store,
		newID: func() string {
			buf := make([]byte, 16)
			_, _ = rand.Read(buf)
			return hex.EncodeToString(buf)
		},
	}
}

func (s *OrganizationService) Get(ctx context.Context, principal authz.Principal, id string) (domain.Organization, error) {
	org, err := s.store.OrganizationByID(ctx, id)
	if err != nil {
		return domain.Organization{}, err
	}
	if !s.canView(principal, org) {
		return domain.Organization{}, apperrors.ErrForbidden
	}
	return org, nil
}

func (s *OrganizationService) canView(principal authz.Principal, org domain.Organization) bool {
	switch principal.Role {
	case domain.RoleRoot, domain.RoleManager, domain.RoleTreasurer,
		domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer:
		return true
	case domain.RoleUser:
		return org.AccountID == principal.AccountID || org.ID == principal.OrganizationID || contains(org.Subaccounts, principal.AccountID) || contains(org.InvitedIDs, principal.AccountID)
	case domain.RoleProvider, domain.RoleSeniorProvider:
		return org.Type == domain.OrgTypeProvider
	default:
		return false
	}
}

func contains(xs []string, v string) bool {
	for _, x := range xs {
		if x == v {
			return true
		}
	}
	return false
}

func (s *OrganizationService) Create(ctx context.Context, principal authz.Principal, name, inn, country string, orgType domain.OrganizationType) (domain.Organization, error) {
	if orgType == domain.OrgTypeProvider {
		if err := authz.RequireRoles(principal, domain.RoleSeniorProvider, domain.RoleRoot); err != nil {
			return domain.Organization{}, err
		}
	} else {
		if err := authz.RequireRoles(principal, domain.RoleUser, domain.RoleManager, domain.RoleRoot); err != nil {
			return domain.Organization{}, err
		}
		orgType = domain.OrgTypeClient
	}
	org := domain.Organization{
		ID:        s.newID(),
		AccountID: principal.AccountID,
		Status:    domain.OrgNotApproved,
		IsActive:  false,
		Name:      name,
		INN:       inn,
		Country:   country,
		Type:      orgType,
	}
	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return domain.Organization{}, err
	}
	return org, nil
}

func (s *OrganizationService) Delete(ctx context.Context, principal authz.Principal, id string) error {
	org, err := s.Get(ctx, principal, id)
	if err != nil {
		return err
	}
	switch principal.Role {
	case domain.RoleUser:
		if org.AccountID != principal.AccountID {
			return apperrors.ErrForbidden
		}
		return s.store.DeleteOrganization(ctx, id)
	case domain.RoleManager, domain.RoleRoot:
		return s.store.DeleteOrganization(ctx, id)
	case domain.RoleSeniorProvider:
		if org.Type != domain.OrgTypeProvider {
			return apperrors.ErrForbidden
		}
		org.IsActive = false
		return s.store.SaveOrganization(ctx, org)
	default:
		return apperrors.ErrForbidden
	}
}

func (s *OrganizationService) SetRating(ctx context.Context, principal authz.Principal, id string, rating domain.ClientRating) (domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleInternalComplianceOfficer); err != nil {
		return domain.Organization{}, err
	}
	org, err := s.store.OrganizationByID(ctx, id)
	if err != nil {
		return domain.Organization{}, err
	}
	org.Rating = rating
	if rating == domain.RatingRed || rating == domain.RatingYellow {
		org.Status = domain.OrgAwaitingProcessing
	}
	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return domain.Organization{}, err
	}
	return org, nil
}

func (s *OrganizationService) ListAwaiting(ctx context.Context, principal authz.Principal) ([]domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleInternalComplianceOfficer); err != nil {
		return nil, err
	}
	return s.store.ListAwaiting(ctx), nil
}

func (s *OrganizationService) Approve(ctx context.Context, principal authz.Principal, id string) (domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer); err != nil {
		return domain.Organization{}, err
	}
	org, err := s.store.OrganizationByID(ctx, id)
	if err != nil {
		return domain.Organization{}, err
	}
	org.Status = domain.OrgApproved
	org.IsActive = true
	org.Blocked = false
	org.FieldsFrozen = true
	org.Rating = domain.RatingNone
	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return domain.Organization{}, err
	}
	return org, nil
}

func (s *OrganizationService) UnApprove(ctx context.Context, principal authz.Principal, id string) (domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer); err != nil {
		return domain.Organization{}, err
	}
	org, err := s.store.OrganizationByID(ctx, id)
	if err != nil {
		return domain.Organization{}, err
	}
	org.Status = domain.OrgNotApproved
	org.IsActive = false
	org.FieldsFrozen = false
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *OrganizationService) Block(ctx context.Context, principal authz.Principal, id string) (domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleManager); err != nil {
		return domain.Organization{}, err
	}
	org, err := s.store.OrganizationByID(ctx, id)
	if err != nil {
		return domain.Organization{}, err
	}
	org.Status = domain.OrgBlocked
	org.Blocked = true
	org.IsActive = false
	org.FieldsFrozen = true
	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return domain.Organization{}, err
	}
	if acct, err := s.store.AccountByID(ctx, org.AccountID); err == nil {
		acct.Blocked = true
		_ = s.store.SaveAccount(ctx, acct)
	}
	return org, nil
}

func (s *OrganizationService) Update(ctx context.Context, principal authz.Principal, id string, name, inn, country string) (domain.Organization, error) {
	org, err := s.Get(ctx, principal, id)
	if err != nil {
		return domain.Organization{}, err
	}
	if org.FieldsFrozen && principal.Role == domain.RoleUser {
		return domain.Organization{}, apperrors.New(apperrors.ErrCodeConflict, "organization fields are immutable after ICO decision")
	}
	if name != "" {
		org.Name = name
	}
	if inn != "" {
		org.INN = inn
	}
	if country != "" {
		org.Country = country
	}
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *OrganizationService) List(ctx context.Context, principal authz.Principal) ([]domain.Organization, error) {
	all, err := s.store.ListOrganizations(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Organization, 0)
	for _, org := range all {
		if s.canView(principal, org) {
			out = append(out, org)
		}
	}
	return out, nil
}

func (s *OrganizationService) Count(ctx context.Context, principal authz.Principal) (int, error) {
	items, err := s.List(ctx, principal)
	if err != nil {
		return 0, err
	}
	return len(items), nil
}

func (s *OrganizationService) InviteSubaccount(ctx context.Context, principal authz.Principal, orgID, accountID string) (domain.Organization, error) {
	org, err := s.Get(ctx, principal, orgID)
	if err != nil {
		return domain.Organization{}, err
	}
	if principal.Role == domain.RoleUser && org.AccountID != principal.AccountID {
		return domain.Organization{}, apperrors.ErrForbidden
	}
	org.InvitedIDs = append(org.InvitedIDs, accountID)
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *OrganizationService) AcceptInvite(ctx context.Context, principal authz.Principal, orgID string) (domain.Organization, error) {
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return domain.Organization{}, err
	}
	if !contains(org.InvitedIDs, principal.AccountID) {
		return domain.Organization{}, apperrors.ErrForbidden
	}
	nextInv := make([]string, 0)
	for _, id := range org.InvitedIDs {
		if id != principal.AccountID {
			nextInv = append(nextInv, id)
		}
	}
	org.InvitedIDs = nextInv
	org.Subaccounts = append(org.Subaccounts, principal.AccountID)
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *OrganizationService) RejectInvite(ctx context.Context, principal authz.Principal, orgID string) (domain.Organization, error) {
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return domain.Organization{}, err
	}
	nextInv := make([]string, 0)
	for _, id := range org.InvitedIDs {
		if id != principal.AccountID {
			nextInv = append(nextInv, id)
		}
	}
	org.InvitedIDs = nextInv
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *OrganizationService) DeleteSubaccount(ctx context.Context, principal authz.Principal, orgID, accountID string) (domain.Organization, error) {
	org, err := s.Get(ctx, principal, orgID)
	if err != nil {
		return domain.Organization{}, err
	}
	next := make([]string, 0)
	for _, id := range org.Subaccounts {
		if id != accountID {
			next = append(next, id)
		}
	}
	org.Subaccounts = next
	return org, s.store.SaveOrganization(ctx, org)
}

func (s *OrganizationService) FetchByINN(_ context.Context, principal authz.Principal, inn string) (map[string]any, error) {
	if err := authz.RequireRoles(principal, domain.RoleUser, domain.RoleManager, domain.RoleRoot); err != nil {
		return nil, err
	}
	return map[string]any{"inn": inn, "name": "stub-kontur-" + inn, "source": "stub"}, nil
}

func (s *OrganizationService) ListInvited(ctx context.Context, principal authz.Principal) ([]domain.Organization, error) {
	all, err := s.store.ListOrganizations(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Organization, 0)
	for _, org := range all {
		if contains(org.InvitedIDs, principal.AccountID) {
			out = append(out, org)
		}
	}
	return out, nil
}
