package behavior

import (
	"context"
	"testing"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/manager-ops/internal/store/memory"
	"github.com/viletech/vdp/shared/managerops"
)

type fixedClock struct{ t time.Time }

func (f fixedClock) Now() time.Time { return f.t }

func TestIngestAndScore(t *testing.T) {
	t.Parallel()
	st := memory.New()
	svc := New(st, nil, fixedClock{t: time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)})
	e := managerops.Event{
		IdempotencyKey: "k1", AccountID: "a1", Source: managerops.SourceCore,
		Kind: managerops.KindApprove, OccurredAt: time.Date(2026, 9, 8, 11, 0, 0, 0, time.UTC),
	}
	status, err := svc.Ingest(context.Background(), e)
	if err != nil || status != "accepted" {
		t.Fatalf("status=%s err=%v", status, err)
	}
	sc, ok, err := svc.Score(context.Background(), "a1", "2026-09-08")
	if err != nil || !ok || sc.Events != 1 || sc.Score != 1 {
		t.Fatalf("score=%+v ok=%v err=%v", sc, ok, err)
	}
	status, err = svc.Ingest(context.Background(), e)
	if err != nil || status != "duplicate" {
		t.Fatalf("dup status=%s err=%v", status, err)
	}
}

func TestTelegramAcceptedWithMembership(t *testing.T) {
	t.Parallel()
	st := memory.New()
	ctx := context.Background()
	_ = st.UpsertChat(ctx, domain.Chat{ChatID: "-100", Active: true})
	_ = st.UpsertPerson(ctx, domain.Person{TelegramUserID: "tg1", AccountID: "a1"})
	_ = st.ReplaceMemberships(ctx, "-100", []domain.Membership{{ChatID: "-100", TelegramUserID: "tg1"}})
	svc := New(st, nil, fixedClock{t: time.Now().UTC()})
	status, err := svc.Ingest(ctx, managerops.Event{
		IdempotencyKey: "tg-ok", AccountID: "a1", TelegramUserID: "tg1",
		Source: managerops.SourceTelegram, Kind: managerops.KindNudgeAck, OccurredAt: time.Now().UTC(),
	})
	if err != nil || status != "accepted" {
		t.Fatalf("status=%s err=%v", status, err)
	}
}

func TestTelegramSkippedOptOut(t *testing.T) {
	t.Parallel()
	st := memory.New()
	ctx := context.Background()
	_ = st.UpsertChat(ctx, domain.Chat{ChatID: "-100", Active: true})
	_ = st.UpsertPerson(ctx, domain.Person{TelegramUserID: "tg1", AccountID: "a1"})
	_ = st.ReplaceMemberships(ctx, "-100", []domain.Membership{{ChatID: "-100", TelegramUserID: "tg1"}})
	_ = st.SetConsent(ctx, domain.Consent{AccountID: "a1", Enabled: false})
	svc := New(st, nil, fixedClock{t: time.Now().UTC()})
	status, err := svc.Ingest(ctx, managerops.Event{
		IdempotencyKey: "k2", AccountID: "a1", TelegramUserID: "tg1",
		Source: managerops.SourceTelegram, Kind: managerops.KindNudgeAck, OccurredAt: time.Now().UTC(),
	})
	if err != nil || status != "skipped_opt_out" {
		t.Fatalf("status=%s err=%v", status, err)
	}
}

func TestTelegramSkippedNoMembership(t *testing.T) {
	t.Parallel()
	st := memory.New()
	svc := New(st, nil, fixedClock{t: time.Now().UTC()})
	status, err := svc.Ingest(context.Background(), managerops.Event{
		IdempotencyKey: "k3", AccountID: "a1", TelegramUserID: "tg9",
		Source: managerops.SourceTelegram, Kind: managerops.KindChatReply, OccurredAt: time.Now().UTC(),
	})
	if err != nil || status != "skipped_no_membership" {
		t.Fatalf("status=%s err=%v", status, err)
	}
}

func TestCoreAlwaysAccepted(t *testing.T) {
	t.Parallel()
	st := memory.New()
	_ = st.SetConsent(context.Background(), domain.Consent{AccountID: "a1", Enabled: false})
	svc := New(st, nil, fixedClock{t: time.Now().UTC()})
	status, err := svc.Ingest(context.Background(), managerops.Event{
		IdempotencyKey: "core1", AccountID: "a1", Source: managerops.SourceCore,
		Kind: managerops.KindApprove, OccurredAt: time.Now().UTC(),
	})
	if err != nil || status != "accepted" {
		t.Fatalf("status=%s err=%v", status, err)
	}
}
