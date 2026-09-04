package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestCalculateCommissionAndConfirmationHash(t *testing.T) {
	t.Parallel()
	commission, err := service.CalculateCommission("1000", "2.5", "USD")
	if err != nil {
		t.Fatal(err)
	}
	if commission.FeeAmount != "25.00" {
		t.Fatalf("fee=%s", commission.FeeAmount)
	}
	hash := service.ConfirmationHashXOR("filebytes", "USD")
	if hash == "" || hash == service.ConfirmationHashXOR("other", "USD") {
		t.Fatal("hash")
	}
}

func TestCatalogUnblockAndLiquidity(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string { return "x1" })
	orgs := service.NewOrganizationService(store)
	ico := authz.Principal{AccountID: seed.ICOID, Role: domain.RoleInternalComplianceOfficer}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	if _, err := orgs.Block(ctx, ico, seed.OrgID); err != nil {
		t.Fatal(err)
	}
	req, err := catalog.RequestUnblock(ctx, user, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	resolved, err := catalog.ResolveUnblock(ctx, manager, req.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if resolved.Status != "approved" {
		t.Fatalf("status=%s", resolved.Status)
	}
	org, _ := store.OrganizationByID(ctx, seed.OrgID)
	if org.Blocked || org.Status != domain.OrgApproved {
		t.Fatalf("org=%#v", org)
	}
	if _, err := catalog.SaveLiquidity(ctx, domain.LiquidityOffer{Direction: "import", Amount: "100", Currency: "USD"}); err != nil {
		t.Fatal(err)
	}
}

func TestImmutableOrgFieldsAfterICO(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	orgs := service.NewOrganizationService(store)
	ico := authz.Principal{AccountID: seed.ICOID, Role: domain.RoleInternalComplianceOfficer}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	if _, err := orgs.Approve(ctx, ico, seed.OrgID); err != nil {
		t.Fatal(err)
	}
	if _, err := orgs.Update(ctx, user, seed.OrgID, "Hacked", "", ""); err == nil {
		t.Fatal("expected immutable error")
	}
}
