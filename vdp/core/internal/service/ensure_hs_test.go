package service_test

import (
	"context"
	"strconv"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestEnsureHsCodeFromOCRAllowsUser(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	n := 0
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string {
		n++
		return "hs-" + strconv.Itoa(n)
	})
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser}
	got, err := catalog.EnsureHsCodeFromOCR(ctx, user, "847130")
	if err != nil {
		t.Fatal(err)
	}
	if got.Code != "847130" {
		t.Fatalf("code=%s", got.Code)
	}
	again, err := catalog.EnsureHsCodeFromOCR(ctx, user, "8471 30")
	if err != nil {
		t.Fatal(err)
	}
	if again.Code != "847130" {
		t.Fatalf("normalized=%s", again.Code)
	}
	list, err := catalog.ListHsCodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, item := range list {
		if item.Code == "847130" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("want one row, got %d", count)
	}
}

func TestEnsureHsCodeFromOCRDeniesProvider(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string { return "hs-x" })
	provider := authz.Principal{AccountID: "prov-1", Role: domain.RoleProvider}
	_, err := catalog.EnsureHsCodeFromOCR(ctx, provider, "847130")
	if err == nil {
		t.Fatal("expected AuthZ deny for provider")
	}
}
