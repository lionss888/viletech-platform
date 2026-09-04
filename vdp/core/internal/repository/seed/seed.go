package seed

import (
	"context"
	"fmt"
	"testing"

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
	BankID     = "77777777-7777-7777-7777-777777777777"
	BankOrgID  = "88888888-8888-8888-8888-888888888888"
	RootID     = "99999999-9999-9999-9999-999999999999"
)

// Dev upserts demo accounts/orgs. Errors must not be ignored — schema drift
// previously surfaced only as login 401 while health stayed green.
func Dev(store repository.Store) error {
	ctx := context.Background()
	accounts := []domain.Account{
		{ID: UserID, Email: "user@vdp.local", PasswordHash: service.HashPassword("user"), Role: domain.RoleUser, OrganizationID: OrgID, FullName: "Ivan Petrov", Phone: "+79990000000", Passport: "4510 123456", Active: true, TelegramNotifyEnabled: true},
		{ID: ManagerID, Email: "manager@vdp.local", PasswordHash: service.HashPassword("manager"), Role: domain.RoleManager, Active: true},
		{ID: ICOID, Email: "ico@vdp.local", PasswordHash: service.HashPassword("ico"), Role: domain.RoleInternalComplianceOfficer, Active: true},
		{ID: ECOID, Email: "eco@vdp.local", PasswordHash: service.HashPassword("eco"), Role: domain.RoleComplianceOfficer, Active: true},
		{ID: ProviderID, Email: "provider@vdp.local", PasswordHash: service.HashPassword("provider"), Role: domain.RoleProvider, Active: true},
		{ID: RootID, Email: "root@vdp.local", PasswordHash: service.HashPassword("root"), Role: domain.RoleRoot, FullName: "Root Admin", Active: true},
		{ID: BankID, Email: "bank@vdp.local", PasswordHash: service.HashPassword("bank"), Role: domain.RoleBank, OrganizationID: BankOrgID, Active: true, BankRateReadonly: true},
	}
	for _, account := range accounts {
		if err := store.SaveAccount(ctx, account); err != nil {
			return fmt.Errorf("seed account %s: %w", account.Email, err)
		}
	}
	if err := store.SaveOrganization(ctx, domain.Organization{
		ID:         OrgID,
		AccountID:  UserID,
		Status:     domain.OrgNotApproved,
		Name:       "ООО Пример",
		INN:        "7700000000",
		Country:    "RU",
		ClientType: domain.ClientTypeUI,
	}); err != nil {
		return fmt.Errorf("seed org: %w", err)
	}
	if err := store.SaveOrganization(ctx, domain.Organization{
		ID:                         BankOrgID,
		AccountID:                  BankID,
		Status:                     domain.OrgApproved,
		IsActive:                   true,
		Name:                       "Bank Client Org",
		INN:                        "7700000001",
		Country:                    "RU",
		ClientType:                 domain.ClientTypeBank,
		BankFixedCommissionPercent: "1.5",
		ApplyPlatformMarkup:        false,
	}); err != nil {
		return fmt.Errorf("seed bank org: %w", err)
	}
	if err := store.SaveWorkChat(ctx, domain.WorkChat{ID: "wc-ops", Title: "Операционка", ChatID: "ops-chat", Kind: "ops", Active: true}); err != nil {
		return fmt.Errorf("seed work chat ops: %w", err)
	}
	if err := store.SaveWorkChat(ctx, domain.WorkChat{ID: "wc-compliance", Title: "Комплаенс", ChatID: "compliance-chat", Kind: "compliance", Active: true}); err != nil {
		return fmt.Errorf("seed work chat compliance: %w", err)
	}
	return nil
}

// MustDev seeds or fails the test immediately.
func MustDev(t testing.TB, store repository.Store) {
	t.Helper()
	if err := Dev(store); err != nil {
		t.Fatalf("seed.Dev: %v", err)
	}
}
