package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/viletech/vdp/delivery/internal/domain"
	"github.com/viletech/vdp/delivery/internal/port"
)

type stubForge struct {
	name string
	err  error
	n    int
}

func (s *stubForge) Name() string { return s.name }

func (s *stubForge) ListReleases(context.Context) ([]domain.Release, error) {
	return []domain.Release{{Tag: "vdp-v1.0.0", Title: "one", IsProduct: true}}, s.err
}

func (s *stubForge) DispatchDeploy(context.Context, domain.Environment, string) error {
	s.n++
	return s.err
}

func (s *stubForge) SetSchedule(context.Context, domain.Environment, string, string) error {
	return s.err
}

func (s *stubForge) SetApprovers(context.Context, domain.Environment, []string) error {
	return s.err
}

var _ port.Forge = (*stubForge)(nil)

func TestPromoteForbiddenForViewer(t *testing.T) {
	t.Parallel()
	svc := New(&stubForge{name: "github"}, nil)
	err := svc.Promote(context.Background(), domain.Identity{Role: domain.RoleViewer}, domain.PromoteCommand{
		Environment: domain.EnvAlpha,
		ImagesRunID: "1",
		Tag:         "sha-abc",
	})
	var forbidden ForbiddenError
	if !errors.As(err, &forbidden) {
		t.Fatalf("want forbidden, got %v", err)
	}
}

func TestPromoteGammaRequiresProductTag(t *testing.T) {
	t.Parallel()
	forge := &stubForge{name: "github"}
	svc := New(forge, nil)
	err := svc.Promote(context.Background(), domain.Identity{Role: domain.RoleDeployerGamma}, domain.PromoteCommand{
		Environment: domain.EnvGamma,
		ImagesRunID: "1",
		Tag:         "sha-abc",
	})
	if err == nil {
		t.Fatal("expected forbidden")
	}
	if forge.n != 0 {
		t.Fatal("must not dispatch on policy fail")
	}
	err = svc.Promote(context.Background(), domain.Identity{Role: domain.RoleDeployerGamma}, domain.PromoteCommand{
		Environment: domain.EnvGamma,
		ImagesRunID: "9",
		Tag:         "vdp-v2.0.0",
	})
	if err != nil {
		t.Fatal(err)
	}
	if forge.n != 1 {
		t.Fatalf("dispatches=%d", forge.n)
	}
}
