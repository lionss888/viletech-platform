package inbox_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/shared/events"
)

func TestPostgresInboxIdempotent(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://vdp_hub:vdp_hub@localhost:5432/vdp_hub?sslmode=disable"
	}
	t.Setenv("STORE_DRIVER", "postgres")
	ctx := context.Background()
	store, err := inbox.Open(ctx, url)
	if err != nil {
		t.Skip("postgres unavailable:", err)
	}
	env := events.Envelope{
		EventID:       fmt.Sprintf("%032x", time.Now().UnixNano())[0:32],
		EventType:     events.TypeTelegramNotify,
		AggregateID:   "form-1",
		AggregateType: "form_payment",
		FormPaymentID: "form-1",
		Payload:       map[string]any{"x": 1},
	}
	if err := store.MarkProcessed(ctx, env, map[string]any{"delivered": true}); err != nil {
		t.Fatal(err)
	}
	rec, ok := store.AlreadyProcessed(ctx, env.EventID)
	if !ok || rec.Result["delivered"] != true {
		t.Fatalf("%v %#v", ok, rec)
	}
	if err := store.MarkProcessed(ctx, env, map[string]any{"delivered": true}); err != nil {
		t.Fatal("second mark:", err)
	}
}
