package corehttp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestListWorkChats(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/work-chats" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{"id": "wc1", "title": "Ops", "chat_id": "-100", "kind": "ops", "active": true},
		})
	}))
	t.Cleanup(srv.Close)
	c := New(srv.URL, "secret", time.Second)
	list, err := c.ListWorkChats(context.Background())
	if err != nil || len(list) != 1 || list[0].ChatID != "-100" {
		t.Fatalf("list=%v err=%v", list, err)
	}
}
