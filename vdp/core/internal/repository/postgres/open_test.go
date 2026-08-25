package postgres_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/postgres"
)

func TestOpenMemoryDriver(t *testing.T) {
	t.Setenv("STORE_DRIVER", "memory")
	store, err := postgres.Open(context.Background(), "memory://")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := store.(*repository.MemoryStore); !ok {
		t.Fatalf("type %T", store)
	}
}
