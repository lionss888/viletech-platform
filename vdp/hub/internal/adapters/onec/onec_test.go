package onec_test

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/onec"
)

func TestOneCIdempotentByExternalID(t *testing.T) {
	t.Setenv("CORE_URL", "")
	t.Setenv("ONEC_URL", "")
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := onec.New(time.Second, 2, log) // fixture mode, no core callback
	params := map[string]any{
		"event_id": "evt-1", "form_payment_id": "f1",
		"payload": map[string]any{"external_id": "ext-99", "cover": "777"},
	}
	a, err := plugin.Execute(context.Background(), "cover", params)
	if err != nil {
		t.Fatal(err)
	}
	b, err := plugin.Execute(context.Background(), "cover", params)
	if err != nil {
		t.Fatal(err)
	}
	if b["idempotent"] != true {
		t.Fatalf("second call %#v", b)
	}
	if a["cover"] != "777" || b["cover"] != "777" {
		t.Fatalf("a=%#v b=%#v", a, b)
	}
}

func TestOneCHTTP409IsIdempotent(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`{"status":"duplicate"}`))
	}))
	t.Cleanup(srv.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := onec.New(time.Second, 1, log).WithBaseURL(srv.URL)
	out, err := plugin.Execute(context.Background(), "cover", map[string]any{
		"event_id": "e-409", "form_payment_id": "f1", "payload": map[string]any{"external_id": "ext-409"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out["idempotent"] != true {
		t.Fatalf("%#v", out)
	}
}

func TestOneCTimeoutFails(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(srv.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := onec.New(50*time.Millisecond, 1, log).WithBaseURL(srv.URL)
	if _, err := plugin.Execute(context.Background(), "fee", map[string]any{"event_id": "e-to", "form_payment_id": "f1"}); err == nil {
		t.Fatal("timeout expected")
	}
}
