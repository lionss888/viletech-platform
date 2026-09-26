package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/shared/openapi"
)

func TestOpenAPIContract_HealthCreateGetAction(t *testing.T) {
	spec, err := openapi.LoadForms()
	if err != nil {
		t.Fatalf("LoadForms: %v", err)
	}
	core, _, _ := newStack(t)

	healthBody := getRaw(t, core, "", "/api/v1/health")
	if err := spec.ValidateNamedSchema("Health", healthBody); err != nil {
		t.Fatalf("GET /api/v1/health schema: %v body=%s", err, healthBody)
	}

	token := login(t, core, "user@vdp.local", "user")
	createBody := postRaw(t, core, token, "/api/v1/forms", map[string]string{
		"currency": "USD", "invoice_amount": "100",
	})
	if err := spec.ValidateNamedSchema("Form", createBody); err != nil {
		t.Fatalf("POST /api/v1/forms schema: %v body=%s", err, createBody)
	}
	var created map[string]any
	if err := json.Unmarshal(createBody, &created); err != nil {
		t.Fatalf("create json: %v", err)
	}
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("create missing id: %s", createBody)
	}

	getBody := getRaw(t, core, token, "/api/v1/forms/"+id)
	if err := spec.ValidateNamedSchema("Form", getBody); err != nil {
		t.Fatalf("GET /api/v1/forms/{id} schema: %v body=%s", err, getBody)
	}

	actionBody := postRaw(t, core, token, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	if err := spec.ValidateNamedSchema("Form", actionBody); err != nil {
		t.Fatalf("POST /api/v1/forms/{id}/actions/{action} schema: %v body=%s", err, actionBody)
	}
}

func getRaw(t *testing.T, h http.Handler, token, path string) []byte {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("GET %s -> %d %s", path, res.Code, res.Body.String())
	}
	return res.Body.Bytes()
}

func postRaw(t *testing.T, h http.Handler, token, path string, payload map[string]string) []byte {
	t.Helper()
	raw := []byte("{}")
	if payload != nil {
		raw, _ = json.Marshal(payload)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code >= 300 {
		t.Fatalf("POST %s -> %d %s", path, res.Code, res.Body.String())
	}
	return res.Body.Bytes()
}
