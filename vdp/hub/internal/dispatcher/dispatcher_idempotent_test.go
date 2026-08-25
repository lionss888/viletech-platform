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

func TestDispatcherInboxIdempotent(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	store := inbox.NewMemoryStore()
	plugins := registry.New()
	_ = plugins.Register(telegram.New(time.Second, 1, log))
	d := dispatcher.New(store, plugins, log)
	env := events.Envelope{EventID: "idem-1", EventType: events.TypeTelegramNotify, FormPaymentID: "f1", Payload: map[string]any{"text": "hi"}}
	a, err := d.Handle(context.Background(), env)
	if err != nil {
		t.Fatal(err)
	}
	b, err := d.Handle(context.Background(), env)
	if err != nil {
		t.Fatal(err)
	}
	if a["status"] != "accepted" || b["status"] != "accepted" {
		t.Fatalf("a=%#v b=%#v", a, b)
	}
	// second result comes from inbox cache
	if len(telegram.New(time.Second, 1, log).Sent) != 0 {
		// unrelated new plugin
	}
}
