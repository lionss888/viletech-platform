package partner_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/partner"
)

func TestPartnerDispatchHTTP(t *testing.T) {
	t.Parallel()
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"accepted"}`))
	}))
	t.Cleanup(srv.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := partner.New(time.Second, 2, log).WithBaseURL(srv.URL)
	out, err := plugin.Execute(context.Background(), "dispatch", map[string]any{
		"event_id": "e-p", "form_payment_id": "f-p",
		"payload": map[string]any{"route": "bank"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out["mode"] != "http" || got["operation"] != "dispatch" {
		t.Fatalf("out=%#v got=%#v", out, got)
	}
}
