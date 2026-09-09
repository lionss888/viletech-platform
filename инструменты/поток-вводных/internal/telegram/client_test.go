package telegram

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGetUpdatesAndSend(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/botTOK/getUpdates":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"ok": true,
				"result": []map[string]any{
					{"update_id": 1, "message": map[string]any{
						"message_id": 2, "text": "hi", "chat": map[string]any{"id": -1},
					}},
				},
			})
		case r.URL.Path == "/botTOK/sendMessage":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	c := New("TOK", time.Second)
	c.SetBaseURL(srv.URL)
	ups, err := c.GetUpdates(context.Background(), 0, 1)
	if err != nil || len(ups) != 1 {
		t.Fatalf("ups=%v err=%v", ups, err)
	}
	if err := c.SendMessage(context.Background(), -1, 2, "принято"); err != nil {
		t.Fatal(err)
	}
}
