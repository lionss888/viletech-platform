package docs_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/docs"
)

func TestGenerateStubReturnsStorageKey(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := docs.New(time.Second, 2, log)
	actual, err := plugin.Execute(context.Background(), "generate", map[string]any{
		"event_id":        "evt-docs-1",
		"form_payment_id": "form-42",
	})
	if err != nil {
		t.Fatal(err)
	}
	storageKey, _ := actual["storage_key"].(string)
	if storageKey == "" {
		t.Fatalf("expected storage_key, got %#v", actual)
	}
	if actual["status"] != "generated" {
		t.Fatalf("expected status generated, got %#v", actual["status"])
	}
	if storageKey != "docs/form-42/stub.pdf" {
		t.Fatalf("unexpected storage_key: %s", storageKey)
	}
}
