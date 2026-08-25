package dispatcher_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/telegram"
	"github.com/viletech/vdp/hub/internal/dispatcher"
	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/hub/internal/registry"
	"github.com/viletech/vdp/shared/events"
)

func TestInboxIdempotent(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	plugins := registry.New()
	tg := telegram.New(time.Second, 2, log)
	if err := plugins.Register(tg); err != nil {
		t.Fatal(err)
	}
	if err := plugins.Register(tg); err == nil {
		t.Fatal("duplicate register must fail")
	}
	d := dispatcher.New(inbox.NewStore(), plugins, log)
	env := events.Envelope{
		EventID:       "evt-1",
		EventType:     events.TypeTelegramNotify,
		FormPaymentID: "form-1",
		Payload:       map[string]any{"to": "notify"},
	}
	if _, err := d.Handle(context.Background(), env); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Handle(context.Background(), env); err != nil {
		t.Fatal(err)
	}
	if len(tg.Sent) != 1 {
		t.Fatalf("expected 1 notify, got %d", len(tg.Sent))
	}
}
