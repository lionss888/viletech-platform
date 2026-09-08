package service

import (
	"context"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// WipeProbeDataResult is returned after local probe cleanup.
type WipeProbeDataResult struct {
	WipedForms int  `json:"wiped_forms"`
	Allowed    bool `json:"allowed"`
}

// WipeProbeData clears all form payments and related docs (accounts kept).
// Caller must ensure wipe is allowed for the environment (SEED_WIPE_FORMS / local).
func (s *FormPaymentService) WipeProbeData(ctx context.Context, principal authz.Principal, allowed bool) (WipeProbeDataResult, error) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		return WipeProbeDataResult{}, err
	}
	if !allowed {
		return WipeProbeDataResult{Allowed: false}, apperrors.New(
			apperrors.ErrCodeForbidden,
			"очистка тестовых заявок отключена в этой среде",
		)
	}
	if wiper, ok := s.store.(repository.ProbeFormWiper); ok {
		n, err := wiper.WipeAllProbeForms(ctx)
		if err != nil {
			return WipeProbeDataResult{}, err
		}
		return WipeProbeDataResult{WipedForms: n, Allowed: true}, nil
	}
	forms := s.store.ListForms(ctx)
	for _, form := range forms {
		if err := s.store.DeleteForm(ctx, form.ID); err != nil {
			return WipeProbeDataResult{}, err
		}
	}
	return WipeProbeDataResult{WipedForms: len(forms), Allowed: true}, nil
}
