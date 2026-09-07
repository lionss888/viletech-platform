package service

import (
	"context"
	"fmt"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	"github.com/viletech/vdp/core/internal/scenarioverify"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ScenarioVerifyService exposes catalog and on-demand scenario runs for root (system.admin).
type ScenarioVerifyService struct {
	environment string
	store       scenarioverify.RunStore
	executor    *scenarioverify.Executor
}

// NewScenarioVerifyService builds the service. Call BindHTTP after the server handler is ready.
func NewScenarioVerifyService(environment string, newID func() string) *ScenarioVerifyService {
	store := scenarioverify.NewMemoryRunStore()
	exec := &scenarioverify.Executor{
		Loopback:    &scenarioverify.Loopback{},
		Environment: environment,
		NewID:       newID,
	}
	return &ScenarioVerifyService{environment: environment, store: store, executor: exec}
}

// BindHTTP attaches the core HTTP handler for mutating loopback runs.
func (s *ScenarioVerifyService) BindHTTP(h http.Handler) {
	if s == nil || s.executor == nil {
		return
	}
	s.executor.Loopback.Handler = h
}

// Catalog lists scenarios (root only).
func (s *ScenarioVerifyService) Catalog(ctx context.Context, principal authz.Principal) ([]scenarioverify.Scenario, error) {
	_ = ctx
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		return nil, err
	}
	return scenarioverify.Catalog(), nil
}

// Policy returns mutating allowance for the current environment.
func (s *ScenarioVerifyService) Policy(ctx context.Context, principal authz.Principal) (map[string]any, error) {
	_ = ctx
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		return nil, err
	}
	return map[string]any{
		"environment":          s.environment,
		"allows_mutating_runs": scenarioverify.AllowsMutatingRuns(s.environment),
		"default_mode":         string(scenarioverify.ResolveMode("", s.environment)),
	}, nil
}

// StartRunRequest is the POST body for scenario runs.
type StartRunRequest struct {
	ScenarioID  string   `json:"scenario_id"`
	ScenarioIDs []string `json:"scenario_ids"`
	Mode        string   `json:"mode"`
}

// StartRuns executes one or more scenarios synchronously and returns the runs.
func (s *ScenarioVerifyService) StartRuns(ctx context.Context, principal authz.Principal, req StartRunRequest) ([]*scenarioverify.Run, error) {
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		return nil, err
	}
	ids := append([]string{}, req.ScenarioIDs...)
	if req.ScenarioID != "" {
		ids = append(ids, req.ScenarioID)
	}
	if len(ids) == 0 {
		return nil, apperrors.Wrap(fmt.Errorf("scenario_id required"), apperrors.ErrCodeValidation, "scenario_id required")
	}
	mode := scenarioverify.Mode(req.Mode)
	var out []*scenarioverify.Run
	for _, id := range ids {
		run, err := s.executor.Execute(ctx, id, mode)
		if err != nil {
			return out, err
		}
		run.ActorID = principal.AccountID
		_ = s.store.Save(run)
		out = append(out, run)
	}
	return out, nil
}

// GetRun returns a prior run.
func (s *ScenarioVerifyService) GetRun(ctx context.Context, principal authz.Principal, id string) (*scenarioverify.Run, error) {
	_ = ctx
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		return nil, err
	}
	run, ok := s.store.Get(id)
	if !ok {
		return nil, apperrors.ErrResourceNotFound
	}
	return run, nil
}

// ListRuns returns recent runs.
func (s *ScenarioVerifyService) ListRuns(ctx context.Context, principal authz.Principal, limit int) ([]*scenarioverify.Run, error) {
	_ = ctx
	if err := authz.RequireSystemCapability(principal, systemcap.CapSystemAdmin); err != nil {
		return nil, err
	}
	return s.store.List(limit), nil
}
