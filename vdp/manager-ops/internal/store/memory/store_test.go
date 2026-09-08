package memory

import (
	"context"
	"testing"
	"time"

	"github.com/viletech/vdp/shared/managerops"
)

func TestSaveEventIdempotent(t *testing.T) {
	t.Parallel()
	st := New()
	e := managerops.Event{
		ID: "1", IdempotencyKey: "k1", AccountID: "a1",
		Source: managerops.SourceCore, Kind: managerops.KindApprove,
		OccurredAt: time.Now().UTC(),
	}
	created, err := st.SaveEvent(context.Background(), e)
	if err != nil || !created {
		t.Fatalf("first save created=%v err=%v", created, err)
	}
	created, err = st.SaveEvent(context.Background(), e)
	if err != nil || created {
		t.Fatalf("second save created=%v err=%v", created, err)
	}
}
