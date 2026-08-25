package service

import (
	"context"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type OrganizationService struct {
	store *repository.Store
}

func NewOrganizationService(store *repository.Store) *OrganizationService {
	return &OrganizationService{store: store}
}

func (s *OrganizationService) Get(ctx context.Context, principal authz.Principal, id string) (domain.Organization, error) {
	org, err := s.store.OrganizationByID(ctx, id)
	if err != nil {
		return domain.Organization{}, err
	}
	if principal.Role == domain.RoleUser && org.AccountID != principal.AccountID && org.ID != principal.OrganizationID {
		return domain.Organization{}, apperrors.ErrForbidden
	}
	if principal.Role == domain.RoleProvider || principal.Role == domain.RoleSeniorProvider {
		return domain.Organization{}, apperrors.ErrForbidden
	}
	return org, nil
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
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
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
	if err := s.store.SaveOrganization(ctx, org); err != nil {
		return domain.Organization{}, err
	}
	return org, nil
}
