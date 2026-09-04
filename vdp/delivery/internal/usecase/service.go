package usecase

import (
	"context"
	"fmt"
	"sync"

	"github.com/viletech/vdp/delivery/internal/authz"
	"github.com/viletech/vdp/delivery/internal/domain"
	"github.com/viletech/vdp/delivery/internal/port"
)

type Service struct {
	primary   port.Forge
	secondary port.Forge
	mu        sync.Mutex
	state     map[domain.Environment]domain.EnvironmentState
}

func New(primary, secondary port.Forge) *Service {
	svc := &Service{primary: primary, secondary: secondary, state: map[domain.Environment]domain.EnvironmentState{}}
	for _, env := range []domain.Environment{domain.EnvAlpha, domain.EnvBeta, domain.EnvGamma, domain.EnvDemo, domain.EnvTest} {
		mode := "button"
		if env == domain.EnvAlpha {
			mode = "on_ready"
		}
		if env == domain.EnvBeta {
			mode = "button_or_window"
		}
		svc.state[env] = domain.EnvironmentState{Name: env, Mode: mode, Status: "unknown"}
	}
	return svc
}

func (s *Service) ListReleases(ctx context.Context, id domain.Identity) ([]domain.Release, error) {
	if !authz.Allowed(id.Role, domain.ActionListReleases, domain.EnvAlpha) {
		return nil, errForbidden("listReleases")
	}
	return s.primary.ListReleases(ctx)
}

func (s *Service) GetEnvironment(_ context.Context, id domain.Identity, env domain.Environment) (domain.EnvironmentState, error) {
	if !authz.Allowed(id.Role, domain.ActionGetEnvironment, env) {
		return domain.EnvironmentState{}, errForbidden("getEnvironment")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := s.state[env]
	if !ok {
		st = domain.EnvironmentState{Name: env, Status: "unknown"}
	}
	st.DisableHint = authz.PromoteBlockedReason(id.Role, env, st.DigestTag)
	return st, nil
}

func (s *Service) ListEnvironments(ctx context.Context, id domain.Identity) ([]domain.EnvironmentState, error) {
	out := make([]domain.EnvironmentState, 0, 5)
	for _, env := range []domain.Environment{domain.EnvAlpha, domain.EnvBeta, domain.EnvGamma, domain.EnvDemo, domain.EnvTest} {
		st, err := s.GetEnvironment(ctx, id, env)
		if err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, nil
}

func (s *Service) Promote(ctx context.Context, id domain.Identity, cmd domain.PromoteCommand) error {
	if hint := authz.PromoteBlockedReason(id.Role, cmd.Environment, cmd.Tag); hint != "" {
		return errForbidden(hint)
	}
	if err := s.primary.DispatchDeploy(ctx, cmd.Environment, cmd.ImagesRunID); err != nil {
		return err
	}
	s.mu.Lock()
	st := s.state[cmd.Environment]
	st.DigestTag = cmd.Tag
	st.LastRunID = cmd.ImagesRunID
	st.Status = "promoting"
	s.state[cmd.Environment] = st
	s.mu.Unlock()
	return nil
}

func (s *Service) Rollback(ctx context.Context, id domain.Identity, cmd domain.PromoteCommand) error {
	if !authz.Allowed(id.Role, domain.ActionRollback, cmd.Environment) {
		return errForbidden("rollback")
	}
	if err := s.primary.DispatchDeploy(ctx, cmd.Environment, cmd.ImagesRunID); err != nil {
		return err
	}
	s.mu.Lock()
	st := s.state[cmd.Environment]
	st.DigestTag = cmd.Tag
	st.LastRunID = cmd.ImagesRunID
	st.Status = "rolling_back"
	s.state[cmd.Environment] = st
	s.mu.Unlock()
	return nil
}

func (s *Service) SetSchedule(ctx context.Context, id domain.Identity, env domain.Environment, mode, window string) error {
	if !authz.Allowed(id.Role, domain.ActionSetSchedule, env) {
		return errForbidden("setSchedule")
	}
	if err := s.primary.SetSchedule(ctx, env, mode, window); err != nil {
		return err
	}
	s.mu.Lock()
	st := s.state[env]
	st.Mode = mode
	s.state[env] = st
	s.mu.Unlock()
	return nil
}

func (s *Service) SetApprovers(ctx context.Context, id domain.Identity, env domain.Environment, logins []string) error {
	if !authz.Allowed(id.Role, domain.ActionSetApprovers, env) {
		return errForbidden("setApprovers")
	}
	if err := s.primary.SetApprovers(ctx, env, logins); err != nil {
		return err
	}
	s.mu.Lock()
	st := s.state[env]
	st.Approvers = append([]string{}, logins...)
	s.state[env] = st
	s.mu.Unlock()
	return nil
}

func (s *Service) SecondaryName() string {
	if s.secondary == nil {
		return ""
	}
	return s.secondary.Name()
}

type ForbiddenError struct{ Reason string }

func (e ForbiddenError) Error() string { return e.Reason }

func errForbidden(reason string) error {
	return ForbiddenError{Reason: fmt.Sprintf("forbidden: %s", reason)}
}
