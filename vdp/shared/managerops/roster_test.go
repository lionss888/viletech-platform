package managerops

import "testing"

func TestSyncRequestValidate(t *testing.T) {
	t.Parallel()
	if err := (SyncRequest{}).Validate(); err == nil {
		t.Fatal("expected error")
	}
	if err := (SyncRequest{ChatID: "-100"}).Validate(); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}
