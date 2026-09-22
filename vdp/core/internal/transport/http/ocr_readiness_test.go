package httpapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOCRReadinessRequiresAuth(t *testing.T) {
	core, _, _ := newStack(t)
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/ocr/readiness", nil)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("anon code=%d body=%s", res.Code, res.Body.String())
	}
}

func TestOCRReadinessAllowsUser(t *testing.T) {
	core, _, _ := newStack(t)
	userTok := login(t, core, "user@vdp.local", "user")
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/ocr/readiness", nil)
	req.Header.Set("Authorization", "Bearer "+userTok)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("user code=%d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if _, ok := payload["ok"]; !ok {
		t.Fatalf("payload=%v", payload)
	}
	if _, ok := payload["extraction"]; !ok {
		t.Fatalf("payload=%v", payload)
	}
}
