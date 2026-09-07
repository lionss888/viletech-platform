package engine_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/viletech/vdp/extraction/internal/engine"
)

func TestYandexPrimaryCompletionHTTPtest(t *testing.T) {
	t.Parallel()
	mux := http.NewServeMux()
	mux.HandleFunc("/foundationModels/v1/completion", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"result": map[string]any{
				"alternatives": []any{
					map[string]any{
						"message": map[string]any{
							"text": `{"schema_version":"v1","header":{"invoice_amount":"10","currency":"USD"},"line_items":[],"meta":{"engine_id":"yandex"}}`,
						},
					},
				},
			},
		})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	y := engine.NewYandex("key", "folder", "gpt://folder/lite")
	y.HTTP = srv.Client()
	y.LLMBase = srv.URL + "/foundationModels/v1"
	y.OCRBase = srv.URL + "/ocr/v1"
	out, err := y.Extract(context.Background(), engine.Input{
		FormPaymentID: "f1",
		LayoutText:    "Invoice amount 10 USD plenty of text here for the layout threshold pad pad pad pad",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Header.Currency != "USD" || out.Meta.EngineID != "yandex" {
		t.Fatalf("%+v", out)
	}
}

func TestOwnFromArtifact(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	metrics := map[string]any{"model_version": "own-test-1", "ready_for_prod_primary": false}
	raw, err := json.Marshal(metrics)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "metrics.json"), raw, 0o640); err != nil {
		t.Fatal(err)
	}
	o := engine.OwnFromArtifact{Path: dir}
	out, err := o.Extract(context.Background(), engine.Input{FormPaymentID: "f2"})
	if err != nil {
		t.Fatal(err)
	}
	if out.Meta.EngineID != "own" || out.Meta.ModelVersion != "own-test-1" {
		t.Fatalf("%+v", out)
	}
}
