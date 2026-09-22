package httpapi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/core/pkg/config"
)

func TestProbeOCRReadinessDoclingDown(t *testing.T) {
	t.Parallel()
	ext := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","primary":"docling","docling_reachable":false}`))
	}))
	t.Cleanup(ext.Close)
	cfg := &config.Config{ExtractionURL: ext.URL}
	got := probeOCRReadiness(context.Background(), cfg, ext.Client())
	if got.OK {
		t.Fatalf("want not ok: %+v", got)
	}
	if got.Reason != "docling_unreachable" {
		t.Fatalf("%+v", got)
	}
	if got.Extraction != "up" {
		t.Fatalf("%+v", got)
	}
}

func TestProbeOCRReadinessExtractionDown(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{ExtractionURL: "http://127.0.0.1:1"}
	got := probeOCRReadiness(context.Background(), cfg, &http.Client{})
	if got.OK || got.Extraction != "down" {
		t.Fatalf("%+v", got)
	}
}
