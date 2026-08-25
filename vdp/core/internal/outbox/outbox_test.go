package outbox_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/outbox"
)

func TestMemoryPendingAndPublish(t *testing.T) {
	t.Parallel()
	store := outbox.NewMemoryStore()
	ctx := context.Background()
	if err := store.Enqueue(ctx, outbox.Event{ID: "1", FormPaymentID: "f"}); err != nil {
		t.Fatal(err)
	}
	pending, err := store.Pending(ctx, 10)
	if err != nil || len(pending) != 1 {
		t.Fatalf("%v %#v", err, pending)
	}
	if err := store.MarkPublished(ctx, "1"); err != nil {
		t.Fatal(err)
	}
	pending, _ = store.Pending(ctx, 10)
	if len(pending) != 0 {
		t.Fatalf("still pending: %#v", pending)
	}
}
