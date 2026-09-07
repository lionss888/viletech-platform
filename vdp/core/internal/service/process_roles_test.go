package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestProcessRolesDisableClearsMandatory(t *testing.T) {
	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	svc := service.NewProcessRoleService(store)
	root := authz.Principal{AccountID: seed.RootID, Role: domain.RoleRoot}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser}

	enabled := false
	_, err := svc.UpdateRole(context.Background(), root, domain.RoleSales, service.RoleConfigUpdate{Enabled: &enabled})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.UpdateRole(context.Background(), root, domain.RoleInternalComplianceOfficer, service.RoleConfigUpdate{Enabled: &enabled})
	if err != nil {
		t.Fatal(err)
	}
	// Manager is mandatory in default — disable must succeed and clear mandatory (continuity).
	snap, err := svc.UpdateRole(context.Background(), root, domain.RoleManager, service.RoleConfigUpdate{Enabled: &enabled})
	if err != nil {
		t.Fatal(err)
	}
	mgr, ok := snap.ConfigFor(domain.RoleManager)
	if !ok || mgr.Enabled || mgr.Mandatory {
		t.Fatalf("manager after disable: enabled=%v mandatory=%v", mgr.Enabled, mgr.Mandatory)
	}
	_, err = svc.UpdateRole(context.Background(), user, domain.RoleSales, service.RoleConfigUpdate{Enabled: &enabled})
	if err == nil {
		t.Fatal("expected forbidden for non-root")
	}
}

func TestProcessRolesPriorities(t *testing.T) {
	store := repository.NewMemoryStore()
	svc := service.NewProcessRoleService(store)
	root := authz.Principal{AccountID: "root", Role: domain.RoleRoot}
	snap, err := svc.UpdatePriorities(context.Background(), root, []domain.Role{
		domain.RoleSales, domain.RoleManager, domain.RoleUser,
	})
	if err != nil {
		t.Fatal(err)
	}
	sales, _ := snap.ConfigFor(domain.RoleSales)
	mgr, _ := snap.ConfigFor(domain.RoleManager)
	if sales.Priority != 10 || mgr.Priority != 20 {
		t.Fatalf("sales=%d manager=%d", sales.Priority, mgr.Priority)
	}
	got, err := formpayment.TargetStatus(formpayment.Form{Status: formpayment.StatusDraft}, formpayment.ActionSubmit, false)
	if err != nil || got != formpayment.StatusOrganizationWaitingVerification {
		t.Fatalf("process path changed: %v %s", err, got)
	}
}
