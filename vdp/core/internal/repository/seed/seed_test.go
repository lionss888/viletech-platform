package seed_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
)

func TestDevSeedsCounterpartiesForUserFlow(t *testing.T) {
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	items, err := store.ListCounterparties(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) < 3 {
		t.Fatalf("expected >=3 seed counterparties, got %d", len(items))
	}
	for _, cp := range items {
		if cp.CreatedBy != seed.UserID {
			t.Fatalf("counterparty %s created_by=%q, want user seed", cp.Name, cp.CreatedBy)
		}
		if cp.Name == "" || cp.Country == "" {
			t.Fatalf("counterparty incomplete: %+v", cp)
		}
	}
}
