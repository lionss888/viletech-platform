package formpayment_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestDefaultConfigParityWithRolesForAction(t *testing.T) {
	t.Parallel()
	snap := formpayment.DefaultProcessPolicySnapshot()
	actions := []formpayment.Action{
		formpayment.ActionSubmit,
		formpayment.ActionICOApprove,
		formpayment.ActionECOAccept,
		formpayment.ActionAssignAgent,
		formpayment.ActionProviderSent,
		formpayment.ActionPaymentStart,
	}
	roles := []domain.Role{
		domain.RoleUser,
		domain.RoleInternalComplianceOfficer,
		domain.RoleComplianceOfficer,
		domain.RoleManager,
		domain.RoleProvider,
		domain.RoleSales,
		domain.RoleViewer,
	}
	for _, action := range actions {
		for _, role := range roles {
			legacy := formpayment.RoleMayPerformLegacy(role, action)
			cfg := formpayment.RoleMayPerformWithConfig(role, action, &snap)
			if role == domain.RoleSales || role == domain.RoleViewer {
				if cfg {
					t.Fatalf("%s/%s: optional observer must not transition", role, action)
				}
				continue
			}
			if legacy != cfg {
				t.Fatalf("%s/%s: legacy=%v cfg=%v", role, action, legacy, cfg)
			}
		}
	}
}

func TestCannotDisableMandatoryRole(t *testing.T) {
	t.Parallel()
	err := formpayment.ValidateRoleConfigUpdate(
		domain.RoleInternalComplianceOfficer, false, formpayment.InfluenceActor,
		[]formpayment.Capability{formpayment.CapFormView, formpayment.CapOrgCompliance},
	)
	if err == nil {
		t.Fatal("expected error disabling ICO")
	}
	err = formpayment.ValidateRoleConfigUpdate(
		domain.RoleSales, false, formpayment.InfluenceObserver,
		[]formpayment.Capability{formpayment.CapFormView, formpayment.CapSalesAttribution},
	)
	if err != nil {
		t.Fatal(err)
	}
}

func TestApplyPriorityOrder(t *testing.T) {
	t.Parallel()
	snap := formpayment.DefaultProcessPolicySnapshot()
	ordered := []domain.Role{domain.RoleManager, domain.RoleUser, domain.RoleSales}
	next, err := formpayment.ApplyPriorityOrder(snap, ordered)
	if err != nil {
		t.Fatal(err)
	}
	mgr, _ := next.ConfigFor(domain.RoleManager)
	user, _ := next.ConfigFor(domain.RoleUser)
	if mgr.Priority >= user.Priority {
		// manager first => priority 10, user 20
	}
	if mgr.Priority != 10 || user.Priority != 20 {
		t.Fatalf("priorities manager=%d user=%d", mgr.Priority, user.Priority)
	}
}

func TestIsMandatoryProcessRole(t *testing.T) {
	t.Parallel()
	if !formpayment.IsMandatoryProcessRole(domain.RoleComplianceOfficer) {
		t.Fatal("ECO must be mandatory")
	}
	if formpayment.IsMandatoryProcessRole(domain.RoleSales) {
		t.Fatal("sales must be optional")
	}
}
