package ocr_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/ocr"
)

func TestOCRRecognizeHTTPAndCallback(t *testing.T) {
	t.Parallel()
	var cb map[string]any
	core := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&cb)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"draft"}`))
	}))
	t.Cleanup(core.Close)
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"recognized","fields":{"currency":"EUR","invoice_amount":"250"}}`))
	}))
	t.Cleanup(provider.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := ocr.New(time.Second, 2, log).WithBaseURL(provider.URL).WithCore(core.URL, "s2s")
	out, err := plugin.Execute(context.Background(), "recognize", map[string]any{
		"event_id": "e-ocr", "form_payment_id": "f-ocr",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out["status"] != "recognized" || out["mode"] != "http" {
		t.Fatalf("%#v", out)
	}
	if cb["action"] != "ocr_recognized" || cb["form_payment_id"] != "f-ocr" {
		t.Fatalf("callback %#v", cb)
	}
	if cb["status"] == "payment_sent" {
		t.Fatal("OCR must not auto-pay")
	}
}
