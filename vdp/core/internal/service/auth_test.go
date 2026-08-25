package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestLoginAndParse(t *testing.T) {
	t.Parallel()
	store := repository.NewStore()
	seed.Dev(store)
	auth := service.NewAuthService(store, "secret", 1)
	token, principal, err := auth.Login(context.Background(), "eco@vdp.local", "eco")
	if err != nil {
		t.Fatal(err)
	}
	if principal.Role != domain.RoleComplianceOfficer {
		t.Fatalf("role=%s", principal.Role)
	}
	parsed, err := auth.Parse(token)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.AccountID != seed.ECOID {
		t.Fatalf("sub=%s", parsed.AccountID)
	}
}
