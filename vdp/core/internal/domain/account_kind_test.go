package domain_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
)

func TestKindForRole(t *testing.T) {
	t.Parallel()
	if domain.KindForRole(domain.RoleRoot) != domain.AccountKindAdmin {
		t.Fatal("root must be admin kind")
	}
	if domain.KindForRole(domain.RoleManager) != domain.AccountKindUser {
		t.Fatal("manager must be user kind")
	}
}

func TestRoleAllowedForKind(t *testing.T) {
	t.Parallel()
	if !domain.RoleAllowedForKind(domain.AccountKindAdmin, domain.RoleRoot) {
		t.Fatal("admin+root ok")
	}
	if domain.RoleAllowedForKind(domain.AccountKindUser, domain.RoleRoot) {
		t.Fatal("user+root forbidden")
	}
	if domain.RoleAllowedForKind(domain.AccountKindAdmin, domain.RoleManager) {
		t.Fatal("admin+manager forbidden")
	}
}
