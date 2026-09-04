package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestOrganizationVIClientStatuses(t *testing.T) {
	t.Parallel()
	store := repository.NewStore()
	seed.MustDev(t, store)
	orgs := service.NewOrganizationService(store)
	ico := authz.Principal{AccountID: seed.ICOID, Role: domain.RoleInternalComplianceOfficer}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	org, err := store.OrganizationByID(context.Background(), seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	if org.ClientStatus() != domain.ClientStatusNew {
		t.Fatalf("want новый got %s", org.ClientStatus())
	}

	org, err = orgs.SetRating(context.Background(), manager, seed.OrgID, domain.RatingYellow)
	if err != nil {
		t.Fatal(err)
	}
	if org.ClientStatus() != domain.ClientStatusAwaiting {
		t.Fatalf("want ожидающий got %s", org.ClientStatus())
	}
	awaiting, err := orgs.ListAwaiting(context.Background(), manager)
	if err != nil || len(awaiting) == 0 {
		t.Fatalf("awaiting queue empty: %v", err)
	}

	org, err = orgs.Approve(context.Background(), ico, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	if org.ClientStatus() != domain.ClientStatusActive {
		t.Fatalf("want активный got %s", org.ClientStatus())
	}

	org, err = orgs.Block(context.Background(), ico, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	if org.ClientStatus() != domain.ClientStatusBlocked {
		t.Fatalf("want заблокированный got %s", org.ClientStatus())
	}
	acct, err := store.AccountByID(context.Background(), seed.UserID)
	if err != nil || !acct.Blocked {
		t.Fatalf("block should mark account blocked: %#v %v", acct, err)
	}
	org, err = orgs.Approve(context.Background(), ico, seed.OrgID)
	if err != nil {
		t.Fatal(err)
	}
	acct, err = store.AccountByID(context.Background(), seed.UserID)
	if err != nil || acct.Blocked {
		t.Fatalf("approve should unblock account: %#v %v", acct, err)
	}
	if org.ClientStatus() != domain.ClientStatusActive {
		t.Fatalf("want активный after re-approve got %s", org.ClientStatus())
	}
}

func TestOrganizationListFilteredByRating(t *testing.T) {
	t.Parallel()
	store := repository.NewStore()
	seed.MustDev(t, store)
	orgs := service.NewOrganizationService(store)
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	if _, err := orgs.SetRating(context.Background(), manager, seed.OrgID, domain.RatingRed); err != nil {
		t.Fatal(err)
	}
	red, err := orgs.ListFiltered(context.Background(), manager, service.OrgListFilter{Rating: "red"})
	if err != nil {
		t.Fatal(err)
	}
	if len(red) != 1 || red[0].ID != seed.OrgID {
		t.Fatalf("red filter=%#v", red)
	}
	yellow, err := orgs.ListFiltered(context.Background(), manager, service.OrgListFilter{Rating: "yellow"})
	if err != nil {
		t.Fatal(err)
	}
	if len(yellow) != 0 {
		t.Fatalf("yellow filter=%#v", yellow)
	}
	awaiting, err := orgs.ListFiltered(context.Background(), manager, service.OrgListFilter{AwaitingProcessing: true})
	if err != nil || len(awaiting) == 0 {
		t.Fatalf("awaiting_processing filter empty: %#v err=%v", awaiting, err)
	}
}

func TestAccountRBACAdminCreateForbiddenForUser(t *testing.T) {
	t.Parallel()
	store := repository.NewStore()
	seed.MustDev(t, store)
	accounts := service.NewAccountService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser}
	if _, err := accounts.CreateAdmin(context.Background(), user, "x@vdp.local", "pass", domain.RoleManager); err == nil {
		t.Fatal("user must not create admin accounts")
	}
}
