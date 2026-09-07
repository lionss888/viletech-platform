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
			// Pilot: ICO/ECO disabled in default snapshot — config path must deny transitions for those roles.
			if role == domain.RoleInternalComplianceOfficer || role == domain.RoleComplianceOfficer {
				if cfg {
					t.Fatalf("%s/%s: disabled compliance must not transition in pilot default", role, action)
				}
				continue
			}
			// Manager may advance disabled compliance slots (continuity bypass).
			if role == domain.RoleManager && (action == formpayment.ActionICOApprove || action == formpayment.ActionICOStart ||
				action == formpayment.ActionECOAccept || action == formpayment.ActionECOStart) {
				if !cfg {
					t.Fatalf("%s/%s: manager bypass of disabled compliance expected", role, action)
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
		domain.RoleManager, false, true, formpayment.InfluenceActor,
		[]formpayment.Capability{formpayment.CapFormView, formpayment.CapManagerOps},
	)
	if err == nil {
		t.Fatal("expected error disabling mandatory manager")
	}
	err = formpayment.ValidateRoleConfigUpdate(
		domain.RoleInternalComplianceOfficer, false, false, formpayment.InfluenceActor,
		[]formpayment.Capability{formpayment.CapFormView, formpayment.CapOrgCompliance},
	)
	if err != nil {
		t.Fatal(err)
	}
	err = formpayment.ValidateRoleConfigUpdate(
		domain.RoleSales, false, false, formpayment.InfluenceObserver,
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
	if mgr.Priority != 10 || user.Priority != 20 {
		t.Fatalf("priorities manager=%d user=%d", mgr.Priority, user.Priority)
	}
}

func TestIsMandatoryProcessRole(t *testing.T) {
	t.Parallel()
	snap := formpayment.DefaultProcessPolicySnapshot()
	if formpayment.IsMandatoryProcessRole(domain.RoleComplianceOfficer, &snap) {
		t.Fatal("ECO must not be mandatory in pilot default")
	}
	if formpayment.IsMandatoryProcessRole(domain.RoleSales, &snap) {
		t.Fatal("sales must be optional")
	}
	if formpayment.IsMandatoryProcessRole(domain.RoleRoot, &snap) {
		t.Fatal("root must not be mandatory process role")
	}
	if !formpayment.IsMandatoryProcessRole(domain.RoleManager, &snap) {
		t.Fatal("manager must be mandatory in pilot default")
	}
	if !formpayment.MandatorySeedFromStageBindings(domain.RoleComplianceOfficer) {
		t.Fatal("seed from StageBindings still marks ECO for migration backfill")
	}
}

func TestDefaultSnapshotPilotSpine(t *testing.T) {
	t.Parallel()
	snap := formpayment.DefaultProcessPolicySnapshot()
	for _, role := range []domain.Role{domain.RoleRoot} {
		if _, ok := snap.ConfigFor(role); ok {
			t.Fatalf("root must not be in default process snapshot")
		}
	}
	ico, ok := snap.ConfigFor(domain.RoleInternalComplianceOfficer)
	if !ok || ico.Enabled || ico.Mandatory {
		t.Fatalf("ICO pilot: enabled=%v mandatory=%v", ico.Enabled, ico.Mandatory)
	}
	eco, ok := snap.ConfigFor(domain.RoleComplianceOfficer)
	if !ok || eco.Enabled || eco.Mandatory {
		t.Fatalf("ECO pilot: enabled=%v mandatory=%v", eco.Enabled, eco.Mandatory)
	}
}
