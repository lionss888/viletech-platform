package service

import (
	"context"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/shared/events"
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
	form.UpdatedAt = time.Now().UTC()
	form.PackDocsJSON()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	payload := map[string]any{
		"action":   "assign_deadline",
		"deadline": deadline.UTC().Format(time.RFC3339),
		"provider": form.ProviderID,
	}
	_ = s.enqueueTelegram(ctx, form, payload)
	_ = s.enqueue(ctx, form, events.TypeMailNotify, map[string]any{
		"template": "execution_deadline", "deadline": deadline.UTC().Format(time.RFC3339),
	})
	if s.bus != nil {
		s.bus.Publish(form.ID, "deadline_changed", payload)
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
	// Link open liquidity offers for this provider to the form (import/export glass).
	if offers, err := s.store.ListLiquidity(ctx, string(form.Direction)); err == nil {
		for _, o := range offers {
			if o.Status == "open" && o.ProviderID == providerID {
				o.Status = "matched"
				o.FormID = form.ID
				_ = s.store.SaveLiquidityOffer(ctx, o)
			}
		}
	}
	return form, nil
}

func (s *FormPaymentService) AssignAgent(ctx context.Context, principal authz.Principal, formID, agentID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	if _, err := s.store.AgentByID(ctx, agentID); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.AgentID = agentID
	form.ManagerID = principal.AccountID
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	switch form.Status {
	case formpayment.StatusFormAccepted, formpayment.StatusContractWaiting,
		formpayment.StatusContractVerification, formpayment.StatusContractWaitingCorrection:
		return s.ResolveContractBranch(ctx, principal, formID)
	default:
		return form, nil
	}
}

func (s *FormPaymentService) SetConfirmation(ctx context.Context, principal authz.Principal, formID, fileContent, fileID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	crypto := isCryptoCurrency(form.Currency)
	if crypto {
		if strings.TrimSpace(fileContent) == "" && strings.TrimSpace(form.ConfirmationHash) == "" {
			return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "crypto confirmation requires transaction hash content")
		}
	} else if strings.TrimSpace(fileID) == "" && strings.TrimSpace(fileContent) == "" {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "fiat confirmation requires payment file or content")
	}
	if fileContent != "" {
		form.ConfirmationHash = ConfirmationHashXOR(fileContent, form.Currency)
	}
	if fileID != "" {
		form.ConfirmationFileID = fileID
	}
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func isCryptoCurrency(currency string) bool {
	switch strings.ToUpper(strings.TrimSpace(currency)) {
	case "BTC", "ETH", "USDT", "USDC", "TON", "TRX", "CRYPTO":
		return true
	default:
		return false
	}
}
