package platformhealth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/platformhealth"
)

func TestProbeCoreAndDeps(t *testing.T) {
	t.Parallel()
	hubOK := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","service":"vdp-hub","plugins":["mail","ocr"]}`))
	}))
	t.Cleanup(hubOK.Close)
	down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusBadGateway)
	}))
	t.Cleanup(down.Close)

	snap := platformhealth.Probe(context.Background(), platformhealth.ProbeConfig{
		Environment:        "development",
		AllowsMutatingRuns: true,
		HTTPClient:         &http.Client{Timeout: time.Second},
		CoreSelf: platformhealth.ServiceResult{
			ID: "core", Name: "Ядро (core)", State: platformhealth.StateUp, LatencyMs: 1, Detail: "ok",
		},
		Targets: []platformhealth.Target{
			{ID: "hub", Name: "Hub", URL: hubOK.URL + "/api/v1/health"},
			{ID: "mail", Name: "Mail gateway", URL: down.URL + "/health"},
			{ID: "ops", Name: "Manager ops", URL: "", Optional: true},
		},
	})
	if snap.Summary.Up < 2 {
		t.Fatalf("expected core+hub up, summary=%+v services=%+v", snap.Summary, snap.Services)
	}
	if snap.Summary.Down != 1 {
		t.Fatalf("expected mail down, summary=%+v", snap.Summary)
	}
	if len(snap.Signals) < 3 {
		t.Fatalf("signals=%v", snap.Signals)
	}
	if snap.Services[0].ID != "core" {
		t.Fatalf("core should be first: %+v", snap.Services)
	}
}
