package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

// enableComplianceActors turns on ICO/ECO for Nest-path regression tests (pilot default is off).
func enableComplianceActors(t *testing.T, svc *service.FormPaymentService) {
	t.Helper()
	root := authz.Principal{AccountID: seed.RootID, Role: domain.RoleRoot}
	on := true
	for _, role := range []domain.Role{domain.RoleInternalComplianceOfficer, domain.RoleComplianceOfficer} {
		if _, err := svc.ProcessRoles().UpdateRole(context.Background(), root, role, service.RoleConfigUpdate{
			Enabled: &on, Mandatory: &on,
		}); err != nil {
			t.Fatalf("enable %s: %v", role, err)
		}
	}
}
