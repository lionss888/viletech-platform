package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/core/internal/scenarioverify"
)

func TestScenarioCatalogRequiresSystemAdmin(t *testing.T) {
	core, _, _ := newStack(t)
	userTok := login(t, core, "user@vdp.local", "user")
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/scenario-catalog", nil)
	req.Header.Set("Authorization", "Bearer "+userTok)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("user catalog code=%d body=%s", res.Code, res.Body.String())
	}

	rootTok := login(t, core, "root@vdp.local", "root")
	res = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/scenario-catalog", nil)
	req.Header.Set("Authorization", "Bearer "+rootTok)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("root catalog code=%d body=%s", res.Code, res.Body.String())
	}
	var items []map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &items); err != nil {
		t.Fatal(err)
	}
	if len(items) < 8 {
		t.Fatalf("catalog too small: %d", len(items))
	}
}

func TestScenarioDryRunHealthAndProdForce(t *testing.T) {
	core, _, _ := newStack(t)
	rootTok := login(t, core, "root@vdp.local", "root")

	body, _ := json.Marshal(map[string]any{
		"scenario_id": scenarioverify.IDHealthCore,
		"mode":        "health",
	})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/scenario-runs", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("health run code=%d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &payload)
	runs, _ := payload["runs"].([]any)
	if len(runs) != 1 {
		t.Fatalf("runs=%v", payload)
	}
	run0, _ := runs[0].(map[string]any)
	if run0["status"] != "passed" {
		t.Fatalf("status=%v body=%s", run0["status"], res.Body.String())
	}

	body, _ = json.Marshal(map[string]any{
		"scenario_id": scenarioverify.IDHappyPathToCompleted,
		"mode":        "dry_run",
	})
	res = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/scenario-runs", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("dry_run code=%d body=%s", res.Code, res.Body.String())
	}
}

func TestScenarioMutatingProviderNoPII(t *testing.T) {
	core, _, _ := newStack(t)
	rootTok := login(t, core, "root@vdp.local", "root")
	body, _ := json.Marshal(map[string]any{
		"scenario_id": scenarioverify.IDProviderPaymentNoPII,
		"mode":        "mutating",
	})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/scenario-runs", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("mutating no_pii code=%d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &payload)
	runs, _ := payload["runs"].([]any)
	run0, _ := runs[0].(map[string]any)
	if run0["status"] != "passed" {
		t.Fatalf("expected passed got %v detail=%s", run0["status"], res.Body.String())
	}
}

func TestScenarioUserForbiddenOnRuns(t *testing.T) {
	core, _, _ := newStack(t)
	userTok := login(t, core, "user@vdp.local", "user")
	body, _ := json.Marshal(map[string]any{"scenario_id": scenarioverify.IDHealthCore, "mode": "health"})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/scenario-runs", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+userTok)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("code=%d", res.Code)
	}
}

func TestScenarioMutatingRootCancel(t *testing.T) {
	core, _, _ := newStack(t)
	rootTok := login(t, core, "root@vdp.local", "root")
	body, _ := json.Marshal(map[string]any{
		"scenario_id": scenarioverify.IDRootCancel,
		"mode":        "mutating",
	})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/scenario-runs", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("root cancel run code=%d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &payload)
	runs, _ := payload["runs"].([]any)
	run0, _ := runs[0].(map[string]any)
	if run0["status"] != "passed" {
		t.Fatalf("expected passed got %v body=%s", run0["status"], res.Body.String())
	}
}
