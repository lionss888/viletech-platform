package service

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/effective"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func TestScenarioVerifyAuthZ(t *testing.T) {
	t.Parallel()
	svc := NewScenarioVerifyService("development", func() string { return "x" })
	user := authz.Principal{AccountID: "u1", Role: domain.RoleUser}
	if _, err := svc.Catalog(context.Background(), user); err != apperrors.ErrForbidden {
		t.Fatalf("want ErrForbidden got %v", err)
	}
	root := authz.Principal{
		AccountID: "root",
		Role:      domain.RoleRoot,
		Caps:      effective.Caps{System: []systemcap.Capability{systemcap.CapSystemAdmin}},
	}
	cat, err := svc.Catalog(context.Background(), root)
	if err != nil {
		t.Fatal(err)
	}
	if len(cat) < 8 {
		t.Fatalf("catalog size %d", len(cat))
	}
}

func TestScenarioVerifyProdForcesDryRunPolicy(t *testing.T) {
	t.Parallel()
	svc := NewScenarioVerifyService("prod", func() string { return "x" })
	root := authz.Principal{
		AccountID: "root",
		Role:      domain.RoleRoot,
		Caps:      effective.Caps{System: []systemcap.Capability{systemcap.CapSystemAdmin}},
	}
	pol, err := svc.Policy(context.Background(), root)
	if err != nil {
		t.Fatal(err)
	}
	if pol["allows_mutating_runs"] != false {
		t.Fatalf("prod must disallow mutating: %v", pol)
	}
	if pol["default_mode"] != "dry_run" {
		t.Fatalf("default_mode=%v", pol["default_mode"])
	}
}
