package docs_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/docs"
)

func TestGeneratePostsPayloadToHTTPURL(t *testing.T) {
	var posts atomic.Int32
	var lastBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", http.StatusMethodNotAllowed)
			return
		}
		body, _ := io.ReadAll(r.Body)
		lastBody = append([]byte(nil), body...)
		posts.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"generated","storage_key":"docs/form-99/live.pdf","mime":"application/pdf"}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("DOCS_URL", srv.URL)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := docs.New(time.Second, 2, log)
	actual, err := plugin.Execute(context.Background(), "generate", map[string]any{
		"event_id":        "evt-http-1",
		"form_payment_id": "form-99",
	})
	if err != nil {
		t.Fatal(err)
	}
	if posts.Load() != 1 {
		t.Fatalf("posts=%d want 1 (stub path must not run)", posts.Load())
	}
	if actual["storage_key"] != "docs/form-99/live.pdf" {
		t.Fatalf("storage_key=%v", actual["storage_key"])
	}
	var payload map[string]any
	if err := json.Unmarshal(lastBody, &payload); err != nil {
		t.Fatal(err)
	}
	if payload["form_payment_id"] != "form-99" {
		t.Fatalf("payload=%#v", payload)
	}
}

func TestGenerateRetriesOn503(t *testing.T) {
	var attempts atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := attempts.Add(1)
		if n == 1 {
			http.Error(w, "busy", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"generated","storage_key":"docs/retry.pdf"}`))
	}))
	t.Cleanup(srv.Close)
	t.Setenv("DOCS_URL", srv.URL)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := docs.New(time.Second, 2, log)
	actual, err := plugin.Execute(context.Background(), "generate", map[string]any{
		"form_payment_id": "form-retry",
	})
	if err != nil {
		t.Fatal(err)
	}
	if attempts.Load() < 2 {
		t.Fatalf("attempts=%d want >=2", attempts.Load())
	}
	if actual["storage_key"] != "docs/retry.pdf" {
		t.Fatalf("result=%#v", actual)
	}
}
