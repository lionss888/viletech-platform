package seed

import (
	"context"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/service"
)

const (
	UserID     = "11111111-1111-1111-1111-111111111111"
	ManagerID  = "22222222-2222-2222-2222-222222222222"
	ICOID      = "33333333-3333-3333-3333-333333333333"
	ECOID      = "44444444-4444-4444-4444-444444444444"
	ProviderID = "55555555-5555-5555-5555-555555555555"
	OrgID      = "66666666-6666-6666-6666-666666666666"
)

func Dev(store *repository.Store) {
	ctx := context.Background()
	accounts := []domain.Account{
		{ID: UserID, Email: "user@vdp.local", PasswordHash: service.HashPassword("user"), Role: domain.RoleUser, OrganizationID: OrgID, FullName: "Ivan Petrov", Phone: "+79990000000", Passport: "4510 123456"},
		{ID: ManagerID, Email: "manager@vdp.local", PasswordHash: service.HashPassword("manager"), Role: domain.RoleManager},
		{ID: ICOID, Email: "ico@vdp.local", PasswordHash: service.HashPassword("ico"), Role: domain.RoleInternalComplianceOfficer},
		{ID: ECOID, Email: "eco@vdp.local", PasswordHash: service.HashPassword("eco"), Role: domain.RoleComplianceOfficer},
		{ID: ProviderID, Email: "provider@vdp.local", PasswordHash: service.HashPassword("provider"), Role: domain.RoleProvider},
	}
	for _, account := range accounts {
		_ = store.SaveAccount(ctx, account)
	}
	_ = store.SaveOrganization(ctx, domain.Organization{
		ID:        OrgID,
		AccountID: UserID,
		Status:    domain.OrgNotApproved,
		Name:      "ООО Пример",
		INN:       "7700000000",
		Country:   "RU",
	})
}
