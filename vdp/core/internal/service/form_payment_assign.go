package service

import (
	"context"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *FormPaymentService) AssignDeadline(ctx context.Context, principal authz.Principal, formID string, deadline time.Time) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.ExecutionDeadline = &deadline
	form.ManagerID = principal.AccountID
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) AssignProvider(ctx context.Context, principal authz.Principal, formID, providerID string, clientAgreed bool) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	provider, err := s.store.AccountByID(ctx, providerID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if provider.Role != domain.RoleProvider && provider.Role != domain.RoleSeniorProvider {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "account is not a provider")
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.ProviderID = providerID
	form.ManagerID = principal.AccountID
	form.ClientAgreedProvider = clientAgreed
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) AssignAgent(ctx context.Context, principal authz.Principal, formID, agentID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.AgentID = agentID
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) SetConfirmation(ctx context.Context, principal authz.Principal, formID, fileContent, fileID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.ConfirmationHash = ConfirmationHashXOR(fileContent, form.Currency)
	form.ConfirmationFileID = fileID
	return form, s.store.SaveForm(ctx, form)
}
