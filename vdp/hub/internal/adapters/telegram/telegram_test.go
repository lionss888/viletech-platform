package telegram_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/telegram"
)

func TestTelegramNotifyHTTPContract(t *testing.T) {
	t.Parallel()
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"accepted","channel":"telegram"}`))
	}))
	t.Cleanup(srv.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := telegram.New(time.Second, 2, log).WithBaseURL(srv.URL)
	actual, err := plugin.Execute(context.Background(), "notify", map[string]any{
		"event_id": "e-tg-1", "form_payment_id": "f-1",
		"payload": map[string]any{"action": "payment_sent", "chat_id": "42"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if actual["mode"] != "http" || actual["status"] != "accepted" {
		t.Fatalf("%#v", actual)
	}
	if got["channel"] != "telegram" || got["form_payment_id"] != "f-1" || got["text"] == nil {
		t.Fatalf("contract payload %#v", got)
	}
}

func TestTelegramRetryOn5xx(t *testing.T) {
	t.Parallel()
	n := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n++
		if n < 2 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"accepted"}`))
	}))
	t.Cleanup(srv.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := telegram.New(time.Second, 3, log).WithBaseURL(srv.URL)
	if _, err := plugin.Execute(context.Background(), "notify", map[string]any{
		"event_id": "e-retry", "form_payment_id": "f",
	}); err != nil {
		t.Fatal(err)
	}
	if n < 2 {
		t.Fatalf("retries=%d", n)
	}
}
