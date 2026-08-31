package mail_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/mail"
)

func TestNotifyStub(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := mail.New(time.Second, 2, log)
	actual, err := plugin.Execute(context.Background(), "notify", map[string]any{
		"event_id":        "evt-mail-1",
		"form_payment_id": "form-7",
		"payload":         map[string]any{"to": "ops@example.com"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if actual["status"] != "accepted" {
		t.Fatalf("expected accepted, got %#v", actual)
	}
	if actual["channel"] != "mail" {
		t.Fatalf("expected mail channel, got %#v", actual)
	}
	if len(plugin.Sent) != 1 {
		t.Fatalf("expected 1 sent, got %d", len(plugin.Sent))
	}
}
