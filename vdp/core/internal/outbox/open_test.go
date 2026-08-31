package outbox_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/viletech/vdp/core/internal/outbox"
)

func TestOpenMemoryDriver(t *testing.T) {
	t.Setenv("STORE_DRIVER", "memory")
	store, err := outbox.Open(context.Background(), "memory://")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := store.(*outbox.MemoryStore); !ok {
		t.Fatalf("type %T", store)
	}
}

func TestEventDataRoundTrip(t *testing.T) {
	t.Parallel()
	payload := map[string]any{"status": "draft"}
	raw, err := json.Marshal(map[string]any{
		"form_payment_id": "form-1",
		"payload":         payload,
	})
	if err != nil {
		t.Fatal(err)
	}
	var decoded struct {
		FormPaymentID string         `json:"form_payment_id"`
		Payload       map[string]any `json:"payload"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.FormPaymentID != "form-1" || decoded.Payload["status"] != "draft" {
		t.Fatalf("%#v", decoded)
	}
}
