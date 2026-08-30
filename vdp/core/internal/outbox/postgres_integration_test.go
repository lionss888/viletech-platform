//go:build integration

package outbox_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository/postgres"
)

func TestPostgresOutboxPublishRoundTrip(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
	 url = "postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable"
	}
	ctx := context.Background()
	db, err := postgres.OpenDB(ctx, url)
	if err != nil {
		t.Skip("postgres unavailable:", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	box := outbox.NewPostgresStore(db)
	formID := fmt.Sprintf("%032x", time.Now().UnixNano())
	formID = formID[len(formID)-32:]
	eventID := fmt.Sprintf("%032x", time.Now().UnixNano()+1)
	eventID = eventID[len(eventID)-32:]
	if err := box.Enqueue(ctx, outbox.Event{
		ID: eventID, AggregateID: formID, AggregateType: "form_payment",
		EventType: "docs.generate", FormPaymentID: formID,
		Payload: map[string]any{"form_payment_id": formID},
	}); err != nil {
		t.Fatal("Enqueue:", err)
	}
	pending, err := box.Pending(ctx, 5)
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) == 0 {
		t.Fatal("expected pending events")
	}
	if err := box.MarkPublished(ctx, eventID); err != nil {
		t.Fatal("MarkPublished:", err)
	}
	pendingAfter, err := box.Pending(ctx, 5)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range pendingAfter {
		if e.ID == eventID {
			t.Fatalf("event still pending after publish: %#v", e)
		}
	}
}
