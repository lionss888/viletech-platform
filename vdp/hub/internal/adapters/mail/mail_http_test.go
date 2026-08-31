package mail_test

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/mail"
)

func TestNotifyPostsPayloadToHTTPURL(t *testing.T) {
	var posts atomic.Int32
	var lastBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", http.StatusMethodNotAllowed)
			return
		}
		body, _ := io.ReadAll(r.Body)
		lastBody = string(body)
		posts.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"accepted","channel":"mail"}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("MAIL_URL", srv.URL)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := mail.New(time.Second, 2, log)
	actual, err := plugin.Execute(context.Background(), "notify", map[string]any{
		"form_payment_id": "form-mail-1",
		"event_id":        "evt-mail-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if posts.Load() != 1 {
		t.Fatalf("posts=%d want 1", posts.Load())
	}
	if actual["channel"] != "mail" {
		t.Fatalf("result=%#v", actual)
	}
	if !strings.Contains(lastBody, "form-mail-1") {
		t.Fatalf("body=%s", lastBody)
	}
	if strings.Contains(strings.ToLower(lastBody), "passport") || strings.Contains(strings.ToLower(lastBody), "phone") {
		t.Fatalf("unexpected PII in payload: %s", lastBody)
	}
}

func TestNotifyHTTPDoesNotUseStubWhenURLSet(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"accepted"}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("MAIL_URL", srv.URL)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := mail.New(time.Second, 1, log)
	if _, err := plugin.Execute(context.Background(), "notify", map[string]any{
		"form_payment_id": "f1",
	}); err != nil {
		t.Fatal(err)
	}
	if len(plugin.Sent) != 0 {
		t.Fatalf("stub Sent buffer must be empty when HTTP URL set, got %#v", plugin.Sent)
	}
}
