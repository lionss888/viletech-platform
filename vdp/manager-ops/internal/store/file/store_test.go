package file_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/manager-ops/internal/store/file"
	"github.com/viletech/vdp/shared/managerops"
)

func TestFileStoreRoundTrip(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	st, err := file.New(dir)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	_ = st.UpsertChat(ctx, domain.Chat{ChatID: "-1", Active: true})
	_ = st.UpsertPerson(ctx, domain.Person{TelegramUserID: "7", AccountID: "a1"})
	_ = st.ReplaceMemberships(ctx, "-1", []domain.Membership{{ChatID: "-1", TelegramUserID: "7"}})
	created, err := st.SaveEvent(ctx, managerops.Event{
		IdempotencyKey: "e1", AccountID: "a1", Source: managerops.SourceCore,
		Kind: managerops.KindApprove, OccurredAt: time.Now().UTC(),
	})
	if err != nil || !created {
		t.Fatalf("created=%v err=%v", created, err)
	}
	st2, err := file.New(dir)
	if err != nil {
		t.Fatal(err)
	}
	ok, err := st2.HasActiveMembership(ctx, "7", "a1")
	if err != nil || !ok {
		t.Fatalf("membership ok=%v err=%v", ok, err)
	}
	ev, err := st2.ListAllEvents(ctx, time.Time{})
	if err != nil || len(ev) != 1 {
		t.Fatalf("events=%d err=%v path=%s", len(ev), err, filepath.Join(dir, "events.jsonl"))
	}
}
