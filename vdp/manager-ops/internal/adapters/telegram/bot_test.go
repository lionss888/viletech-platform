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

func TestEventFromUpdateCallback(t *testing.T) {
	t.Parallel()
	e, ok := EventFromUpdate(map[string]any{
		"callback_query": map[string]any{
			"id": "cb1",
			"from": map[string]any{
				"id": float64(99),
			},
			"message": map[string]any{
				"chat": map[string]any{"id": float64(-100)},
			},
		},
	})
	if !ok || e.Kind != managerops.KindNudgeAck || e.TelegramUserID != "99" {
		t.Fatalf("event=%+v ok=%v", e, ok)
	}
	if e.Payload["text"] != nil {
		t.Fatal("must not store message text")
	}
}

func TestEventFromUpdateMessage(t *testing.T) {
	t.Parallel()
	e, ok := EventFromUpdate(map[string]any{
		"update_id": float64(1),
		"message": map[string]any{
			"message_id": float64(5),
			"text":       "secret should not land in payload",
			"from":       map[string]any{"id": float64(7)},
			"chat":       map[string]any{"id": float64(-100)},
		},
	})
	if !ok || e.Kind != managerops.KindChatReply {
		t.Fatalf("event=%+v ok=%v", e, ok)
	}
	if _, has := e.Payload["text"]; has {
		t.Fatal("text must not be in payload")
	}
}
