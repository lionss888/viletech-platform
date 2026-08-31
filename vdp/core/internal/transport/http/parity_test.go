package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNestRoleFormActionAndParityEndpoints(t *testing.T) {
	core, _, _ := newStack(t)
	token := login(t, core, "user@vdp.local", "user")
	ico := login(t, core, "ico@vdp.local", "ico")
	manager := login(t, core, "manager@vdp.local", "manager")
	created := postJSON(t, core, token, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "200", "no_documents": "true"})
	// no_documents as string in map won't work for bool - create via raw
	_ = created
	body := []byte(`{"currency":"USD","invoice_amount":"200","no_documents":true,"contract_number":"C-1","contract_date":"2026-01-01"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/forms", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code >= 300 {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)
	if form["no_documents"] != true {
		t.Fatalf("no_documents=%v", form["no_documents"])
	}
	putNest(t, core, token, "/api/v1/site/form-payment/"+id+"/form/accept") // may fail if still creating
	postJSON(t, core, token, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	postJSON(t, core, token, "/api/v1/forms/"+id+"/actions/submit", nil)
	putNest(t, core, ico, "/api/v1/ico/form-payment/"+id+"/form/start")
	putNest(t, core, ico, "/api/v1/ico/form-payment/"+id+"/form/accept")
	// org may still be not approved in seed - ico approve org first
	putNest(t, core, ico, "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve")
	agents := postJSON(t, core, manager, "/api/v1/agents", map[string]string{"name": "Agent", "inn": "1"})
	_ = agents
	res = httptest.NewRecorder()
	core.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	if res.Code != 200 {
		t.Fatal("health")
	}
}

func putNest(t *testing.T, h http.Handler, token, path string) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader([]byte("{}")))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code >= 500 {
		t.Fatalf("%s -> %d %s", path, res.Code, res.Body.String())
	}
}
