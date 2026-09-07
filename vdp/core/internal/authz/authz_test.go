package authz

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
)

func TestRequireBusinessAndSystem(t *testing.T) {
	t.Parallel()
	manager := Principal{AccountID: "m1", Role: domain.RoleManager}
	if err := RequireBusinessCapability(manager, formpayment.CapManagerOps); err != nil {
		t.Fatal(err)
	}
	user := Principal{AccountID: "u1", Role: domain.RoleUser}
	if err := RequireBusinessCapability(user, formpayment.CapManagerOps); err == nil {
		t.Fatal("user must not have manager.ops")
	}
	root := Principal{AccountID: "r1", Role: domain.RoleRoot, AccountKind: domain.AccountKindAdmin}
	if err := RequireSystemCapability(root, systemcap.CapAccountsManage); err != nil {
		t.Fatal(err)
	}
	if err := RequireSystemCapability(user, systemcap.CapAccountsManage); err == nil {
		t.Fatal("user must not manage accounts")
	}
	if err := AuthorizeRoles(user, domain.RoleRoot, domain.RoleManager); err == nil {
		t.Fatal("user must not authorize as manager")
	}
	if err := AuthorizeRoles(manager, domain.RoleRoot, domain.RoleManager); err != nil {
		t.Fatal(err)
	}
}
