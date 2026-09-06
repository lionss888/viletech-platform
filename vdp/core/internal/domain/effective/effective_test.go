package effective_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/effective"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
)

func TestResolveUserTemplateAndNarrowOverride(t *testing.T) {
	t.Parallel()
	tpl, _ := formpayment.DefaultTemplateForRole(domain.RoleManager)
	caps, err := effective.Resolve(domain.AccountKindUser, domain.RoleManager, tpl, nil, []formpayment.Capability{formpayment.CapFormView}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if !caps.HasBusiness(formpayment.CapFormView) {
		t.Fatal("expected form.view")
	}
	if caps.HasBusiness(formpayment.CapManagerOps) {
		t.Fatal("override should remove manager.ops")
	}
	if len(caps.System) != 0 {
		t.Fatal("user must not have system caps")
	}
}

func TestResolveUserRejectsSystemOverride(t *testing.T) {
	t.Parallel()
	tpl, _ := formpayment.DefaultTemplateForRole(domain.RoleUser)
	_, err := effective.Resolve(domain.AccountKindUser, domain.RoleUser, tpl, nil, nil, []systemcap.Capability{systemcap.CapAccountsManage})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestResolveRootLocksSystemCaps(t *testing.T) {
	t.Parallel()
	tpl := formpayment.RoleProcessConfig{Role: domain.RoleRoot, Enabled: true, Influence: formpayment.InfluenceActor, Capabilities: formpayment.AdminBusinessCaps()}
	caps, err := effective.Resolve(domain.AccountKindAdmin, domain.RoleRoot, tpl, nil, nil, []systemcap.Capability{systemcap.CapDirectoriesManage})
	if err != nil {
		t.Fatal(err)
	}
	if !caps.HasSystem(systemcap.CapAccountsManage) || !caps.HasSystem(systemcap.CapProcessRolesManage) || !caps.HasSystem(systemcap.CapSystemAdmin) {
		t.Fatal("locked root system caps missing")
	}
}

func TestIsMandatoryProcessRoleExcludesRoot(t *testing.T) {
	t.Parallel()
	if formpayment.IsMandatoryProcessRole(domain.RoleRoot) {
		t.Fatal("root must not be mandatory process role")
	}
	if !formpayment.IsMandatoryProcessRole(domain.RoleManager) {
		t.Fatal("manager is mandatory")
	}
}
