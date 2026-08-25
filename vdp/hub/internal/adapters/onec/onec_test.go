package onec_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/onec"
)

func TestOneCIdempotentByExternalID(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := onec.New(time.Second, 2, log) // fixture mode, no core callback
	params := map[string]any{
		"event_id": "evt-1", "form_payment_id": "f1",
		"payload": map[string]any{"external_id": "ext-99", "cover": "777"},
	}
	a, err := plugin.Execute(context.Background(), "cover", params)
	if err != nil {
		t.Fatal(err)
	}
	b, err := plugin.Execute(context.Background(), "cover", params)
	if err != nil {
		t.Fatal(err)
	}
	if b["idempotent"] != true {
		t.Fatalf("second call %#v", b)
	}
	if a["cover"] != "777" || b["cover"] != "777" {
		t.Fatalf("a=%#v b=%#v", a, b)
	}
}
