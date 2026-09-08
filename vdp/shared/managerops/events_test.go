package managerops

import (
	"testing"
	"time"
)

func TestEventValidate(t *testing.T) {
	t.Parallel()
	now := time.Now().UTC()
	ok := Event{
		ID: "e1", AccountID: "a1", Source: SourceCore, Kind: KindApprove, OccurredAt: now,
	}
	if err := ok.Validate(); err != nil {
		t.Fatalf("expected valid: %v", err)
	}
	bad := ok
	bad.Kind = "pay"
	if err := bad.Validate(); err == nil {
		t.Fatal("expected unsupported kind")
	}
	pii := ok
	pii.Payload = map[string]any{"passport": "x"}
	if err := pii.Validate(); err == nil {
		t.Fatal("expected PII reject")
	}
}

func TestEventKey(t *testing.T) {
	t.Parallel()
	e := Event{ID: "id", IdempotencyKey: "k"}
	if e.Key() != "k" {
		t.Fatalf("got %q", e.Key())
	}
}
