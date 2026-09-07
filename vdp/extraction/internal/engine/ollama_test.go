package engine_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/extraction/internal/engine"
	"github.com/viletech/vdp/shared/extraction"
)

type stubFewShot struct {
	recs []extraction.GoldRecord
}

func (s stubFewShot) RecentConfirmed(k int) ([]extraction.GoldRecord, error) {
	if k > len(s.recs) {
		k = len(s.recs)
	}
	return s.recs[:k], nil
}

func TestOllamaPrimaryHTTPtest(t *testing.T) {
	t.Parallel()
	mux := http.NewServeMux()
	mux.HandleFunc("/api/chat", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"message": map[string]any{
				"content": `{"schema_version":"v1","header":{"invoice_amount":"42","currency":"EUR"},"line_items":[{"line_no":1,"description":"Item","line_amount":"42","currency":"EUR"}],"meta":{"engine_id":"own"}}`,
			},
		})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	human := extraction.FixtureResult("ex1")
	fs := stubFewShot{recs: []extraction.GoldRecord{{
		GoldID:        "g1",
		FormPaymentID: "ex1",
		LayoutText:    "sample layout",
		HumanOut:      &human,
		UpdatedAt:     time.Now().UTC(),
	}}}
	o := engine.NewOllama(srv.URL, "qwen2.5:3b", 1, fs)
	o.HTTP = srv.Client()
	out, err := o.Extract(context.Background(), engine.Input{
		FormPaymentID: "f1",
		LayoutText:    "Invoice 42 EUR plenty of padding text for extraction prompt here",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Meta.EngineID != "own" || out.Header.Currency != "EUR" {
		t.Fatalf("%+v", out)
	}
}

func TestOllamaPrimaryServerError(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	t.Cleanup(srv.Close)
	o := engine.NewOllama(srv.URL, "qwen2.5:3b", 0, nil)
	o.HTTP = srv.Client()
	_, err := o.Extract(context.Background(), engine.Input{LayoutText: "x"})
	if err == nil {
		t.Fatal("expected error")
	}
}
