package diadoc_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/diadoc"
)

func TestDiadocSignAndCoreCallback(t *testing.T) {
	t.Parallel()
	var callbacks int32
	core := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-VDP-S2S") != "secret" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["action"] != "diadoc_signed" {
			t.Errorf("action=%v", body["action"])
		}
		atomic.AddInt32(&callbacks, 1)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"f1","status":"report_waiting_verification"}`))
	}))
	t.Cleanup(core.Close)
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"queued"}`))
	}))
	t.Cleanup(provider.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := diadoc.New(time.Second, 2, log).WithBaseURL(provider.URL).WithCore(core.URL, "secret")
	out, err := plugin.Execute(context.Background(), "sign", map[string]any{
		"event_id": "e-d1", "form_payment_id": "f1",
		"payload": map[string]any{"kind": "report"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if atomic.LoadInt32(&callbacks) != 1 {
		t.Fatal("core callback expected")
	}
	if out["mode"] != "http" {
		t.Fatalf("%#v", out)
	}
}
