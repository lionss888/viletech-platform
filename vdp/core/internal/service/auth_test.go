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
	seed.MustDev(t, store)
	auth := service.NewAuthService(store, "secret", 1)
	session, err := auth.Login(context.Background(), "eco@vdp.local", "eco")
	if err != nil {
		t.Fatal(err)
	}
	if session.Role != domain.RoleComplianceOfficer {
		t.Fatalf("role=%s", session.Role)
	}
	parsed, err := auth.Parse(session.Token)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.AccountID != seed.ECOID {
		t.Fatalf("sub=%s", parsed.AccountID)
	}
}

func TestRegisterConfirmRefreshLogout(t *testing.T) {
	t.Parallel()
	store := repository.NewStore()
	auth := service.NewAuthService(store, "secret", 1)
	code, err := auth.Register(context.Background(), "new@vdp.local", "pass123", "New User")
	if err != nil || code == "" {
		t.Fatalf("register: %v code=%q", err, code)
	}
	_, err = auth.Login(context.Background(), "new@vdp.local", "pass123")
	if err == nil {
		t.Fatal("inactive account must not login")
	}
	session, err := auth.ConfirmRegistration(context.Background(), "new@vdp.local", code)
	if err != nil {
		t.Fatal(err)
	}
	refreshed, err := auth.Refresh(context.Background(), session.RefreshToken)
	if err != nil {
		t.Fatal(err)
	}
	principal, err := auth.Parse(refreshed.Token)
	if err != nil {
		t.Fatal(err)
	}
	if err := auth.Logout(context.Background(), principal); err != nil {
		t.Fatal(err)
	}
	if _, err := auth.Refresh(context.Background(), refreshed.RefreshToken); err == nil {
		t.Fatal("refresh after logout must fail")
	}
}
