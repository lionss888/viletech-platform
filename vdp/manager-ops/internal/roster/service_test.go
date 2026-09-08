package roster

import (
	"context"
	"testing"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/store/memory"
	"github.com/viletech/vdp/shared/managerops"
)

type fixedClock struct{ t time.Time }

func (f fixedClock) Now() time.Time { return f.t }

type stubTG struct {
	members []managerops.MemberSnapshot
}

func (s stubTG) ListMembers(context.Context, string) ([]managerops.MemberSnapshot, error) {
	return s.members, nil
}
func (stubTG) SendNudge(context.Context, string, string) error { return nil }

func TestSyncChatAllowlist(t *testing.T) {
	t.Parallel()
	st := memory.New()
	svc := New(st, nil, stubTG{members: []managerops.MemberSnapshot{{TelegramUserID: "1"}}}, fixedClock{t: time.Unix(0, 0).UTC()}, []string{"-100"})
	n, err := svc.SyncChat(context.Background(), managerops.SyncRequest{ChatID: "-100"})
	if err != nil || n != 1 {
		t.Fatalf("n=%d err=%v", n, err)
	}
	_, err = svc.SyncChat(context.Background(), managerops.SyncRequest{ChatID: "-999"})
	if err == nil {
		t.Fatal("expected allowlist error")
	}
}
