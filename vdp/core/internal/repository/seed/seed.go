package seed

import (
	"context"
	"fmt"
	"os"
	"strings"
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

// Dev upserts demo accounts/orgs only (no sample forms, counterparties, or work chats).
// Errors must not be ignored — schema drift previously surfaced only as login 401 while health stayed green.
func Dev(store repository.Store) error {
	ctx := context.Background()
	accounts := []domain.Account{
		{ID: UserID, Email: "user@vdp.local", PasswordHash: service.HashPassword("user"), Role: domain.RoleUser, AccountKind: domain.AccountKindUser, OrganizationID: OrgID, FullName: "Ivan Petrov", Phone: "+79990000000", Passport: "4510 123456", Active: true, TelegramNotifyEnabled: true},
		{ID: ManagerID, Email: "manager@vdp.local", PasswordHash: service.HashPassword("manager"), Role: domain.RoleManager, AccountKind: domain.AccountKindUser, FullName: "Manager Seed", Active: true},
		{ID: ICOID, Email: "ico@vdp.local", PasswordHash: service.HashPassword("ico"), Role: domain.RoleInternalComplianceOfficer, AccountKind: domain.AccountKindUser, FullName: "ICO Seed", Active: true},
		{ID: ECOID, Email: "eco@vdp.local", PasswordHash: service.HashPassword("eco"), Role: domain.RoleComplianceOfficer, AccountKind: domain.AccountKindUser, FullName: "ECO Seed", Active: true},
		{ID: ProviderID, Email: "provider@vdp.local", PasswordHash: service.HashPassword("provider"), Role: domain.RoleProvider, AccountKind: domain.AccountKindUser, FullName: "Provider Seed", Active: true},
		{ID: RootID, Email: "root@vdp.local", PasswordHash: service.HashPassword("root"), Role: domain.RoleRoot, AccountKind: domain.AccountKindAdmin, FullName: "Root Admin", Active: true},
		{ID: BankID, Email: "bank@vdp.local", PasswordHash: service.HashPassword("bank"), Role: domain.RoleBank, AccountKind: domain.AccountKindUser, OrganizationID: BankOrgID, FullName: "Bank Seed", Active: true, BankRateReadonly: true},
	}
	for _, account := range accounts {
		if err := store.SaveAccount(ctx, account); err != nil {
			return fmt.Errorf("seed account %s: %w", account.Email, err)
		}
	}
	if err := store.SaveOrganization(ctx, domain.Organization{
		ID:         OrgID,
		AccountID:  UserID,
		Status:     domain.OrgApproved,
		IsActive:   true,
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
	return nil
}

// ShouldWipeForms reports whether local/compose should clear probe forms on boot or via admin wipe.
// Explicit SEED_WIPE_FORMS=1 wins (even on demo). SEED_WIPE_FORMS=0 always disables.
// Without the flag: wipe on development/local/test/ci; never on production/staging/named deploy envs.
func ShouldWipeForms(environment string) bool {
	flag := strings.TrimSpace(os.Getenv("SEED_WIPE_FORMS"))
	if flag == "0" || strings.EqualFold(flag, "false") || strings.EqualFold(flag, "off") {
		return false
	}
	if flag == "1" || strings.EqualFold(flag, "true") || strings.EqualFold(flag, "on") {
		return true
	}
	env := strings.ToLower(strings.TrimSpace(environment))
	switch env {
	case "production", "prod", "staging", "alpha", "beta", "gamma", "demo":
		return false
	default:
		return true
	}
}

// WipeForms deletes all form payments and related rows (local probe cleanup).
// Prefer bulk wipe when the store implements repository.ProbeFormWiper.
func WipeForms(store repository.Store) error {
	ctx := context.Background()
	if wiper, ok := store.(repository.ProbeFormWiper); ok {
		_, err := wiper.WipeAllProbeForms(ctx)
		return err
	}
	for _, form := range store.ListForms(ctx) {
		if err := store.DeleteForm(ctx, form.ID); err != nil {
			return fmt.Errorf("wipe form %s: %w", form.ID, err)
		}
	}
	return nil
}

// WipeFormsCount clears forms and returns how many existed before wipe.
func WipeFormsCount(store repository.Store) (int, error) {
	ctx := context.Background()
	if wiper, ok := store.(repository.ProbeFormWiper); ok {
		return wiper.WipeAllProbeForms(ctx)
	}
	n := len(store.ListForms(ctx))
	if err := WipeForms(store); err != nil {
		return 0, err
	}
	return n, nil
}

// ProbeFormWiper is implemented by postgres for fast local cleanup.
// Deprecated: use repository.ProbeFormWiper.
type ProbeFormWiper = repository.ProbeFormWiper


// ForceOrgNotApproved sets the pilot client org to not approved (for ICO-path tests).
func ForceOrgNotApproved(store repository.Store) error {
	ctx := context.Background()
	org, err := store.OrganizationByID(ctx, OrgID)
	if err != nil {
		return err
	}
	org.Status = domain.OrgNotApproved
	org.IsActive = false
	return store.SaveOrganization(ctx, org)
}

// MustDev seeds or fails the test immediately.
func MustDev(t testing.TB, store repository.Store) {
	t.Helper()
	if err := Dev(store); err != nil {
		t.Fatalf("seed.Dev: %v", err)
	}
}
