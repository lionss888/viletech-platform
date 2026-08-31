package authz_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestRequireRolesAndAccess(t *testing.T) {
	t.Parallel()
	manager := authz.Principal{AccountID: "m1", Role: domain.RoleManager}
	if err := authz.RequireRoles(manager, domain.RoleManager); err != nil {
		t.Fatal(err)
	}
	user := authz.Principal{AccountID: "u1", Role: domain.RoleUser}
	if err := authz.RequireRoles(user, domain.RoleManager); err == nil {
		t.Fatal("expected forbidden")
	}
	form := formpayment.Form{AccountID: "u1", ProviderID: "p1"}
	if err := authz.CanAccessForm(user, form); err != nil {
		t.Fatal(err)
	}
	if err := authz.CanAccessForm(authz.Principal{AccountID: "u2", Role: domain.RoleUser}, form); err == nil {
		t.Fatal("expected forbidden")
	}
}
