package httpapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPlatformHealthRequiresSystemAdmin(t *testing.T) {
	core, _, _ := newStack(t)
	userTok := login(t, core, "user@vdp.local", "user")
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/platform-health", nil)
	req.Header.Set("Authorization", "Bearer "+userTok)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("user platform-health code=%d body=%s", res.Code, res.Body.String())
	}

	rootTok := login(t, core, "root@vdp.local", "root")
	res = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/platform-health", nil)
	req.Header.Set("Authorization", "Bearer "+rootTok)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("root platform-health code=%d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	services, _ := payload["services"].([]any)
	if len(services) < 1 {
		t.Fatalf("expected at least core service, payload=%v", payload)
	}
	signals, _ := payload["signals"].([]any)
	if len(signals) < 2 {
		t.Fatalf("expected signals, payload=%v", payload)
	}
}
