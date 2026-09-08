package telegram

import (
	"context"
	"testing"

	"github.com/viletech/vdp/shared/managerops"
)

func TestFixtureListAndNudge(t *testing.T) {
	t.Parallel()
	b := New("", nil)
	b.SetFixtureMembers("-1", []managerops.MemberSnapshot{{TelegramUserID: "42", Username: "mgr"}})
	m, err := b.ListMembers(context.Background(), "-1")
	if err != nil || len(m) != 1 {
		t.Fatalf("members=%v err=%v", m, err)
	}
	if err := b.SendNudge(context.Background(), "-1", "ok"); err != nil {
		t.Fatal(err)
	}
}
