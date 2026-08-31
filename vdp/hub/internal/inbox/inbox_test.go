package inbox_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/shared/events"
)

func TestOpenMemoryDriver(t *testing.T) {
	t.Setenv("STORE_DRIVER", "memory")
	store, err := inbox.Open(context.Background(), "memory://")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := store.(*inbox.MemoryStore); !ok {
		t.Fatalf("type %T", store)
	}
}

func TestMemoryIdempotent(t *testing.T) {
	t.Parallel()
	store := inbox.NewMemoryStore()
	ctx := context.Background()
	env := events.Envelope{EventID: "e1", EventType: "telegram.notify", FormPaymentID: "f1"}
	if _, ok := store.AlreadyProcessed(ctx, env.EventID); ok {
		t.Fatal("unexpected")
	}
	if err := store.MarkProcessed(ctx, env, map[string]any{"ok": true}); err != nil {
		t.Fatal(err)
	}
	rec, ok := store.AlreadyProcessed(ctx, env.EventID)
	if !ok || rec.Result["ok"] != true {
		t.Fatalf("%v %#v", ok, rec)
	}
}
