package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR3ContractTypesTemplateManualAttachOnBehalf(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	ico := login(t, core, "ico@vdp.local", "ico")
	eco := login(t, core, "eco@vdp.local", "eco")

	agent := postJSON(t, core, manager, "/api/v1/agents", map[string]string{"name": "PA-R3", "inn": "7700123456"})
	agentID, _ := agent["id"].(string)
	if agentID == "" {
		t.Fatal("agent id")
	}

	tpl := postAnyJSON(t, core, manager, http.MethodPost, "/api/v1/admin/contract/template", map[string]any{
		"agent": agentID, "name": "tpl-agency", "file_id": "f-tpl", "type": "agency",
	}, http.StatusCreated)
	if tpl["agent_id"] != agentID {
		t.Fatalf("template agent=%v", tpl["agent_id"])
	}
	oneTpl := getJSON(t, core, user, "/api/v1/contract/one/template?agent_id="+agentID)
	if oneTpl["agent_id"] != agentID {
		t.Fatalf("one/template agent=%v", oneTpl["agent_id"])
	}

	for _, ctype := range []string{"agency", "subagency", "services"} {
		body := map[string]any{"type": ctype, "organization_id": "66666666-6666-6666-6666-666666666666"}
		if ctype == "services" {
			body = map[string]any{"type": ctype, "account_ref": "22222222-2222-2222-2222-222222222222"}
		}
		c := postAnyJSON(t, core, manager, http.MethodPost, "/api/v1/admin/contract", body, http.StatusCreated)
		if c["type"] != ctype {
			t.Fatalf("want type %s got %v", ctype, c["type"])
		}
	}

	body := []byte(`{"currency":"USD","invoice_amount":"500","no_documents":true,"contract_number":"C-R3","contract_date":"2026-01-01"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)
	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustStatus(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil, 200)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)

	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/agent", map[string]string{"agent_id": agentID})
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	st, _ := got["status"].(string)
	if st != "contract_waiting" && st != "contract_verification" {
		t.Fatalf("after assign agent status=%v want contract_waiting|contract_verification", got["status"])
	}

	attach := postAnyJSON(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/contract/attach", map[string]any{
		"type": "agency", "file_id": "file-manual", "number": "MAN-1",
	}, http.StatusOK)
	formObj, _ := attach["form"].(map[string]any)
	contractObj, _ := attach["contract"].(map[string]any)
	if formObj["status"] != "signing_order" {
		t.Fatalf("after attach status=%v", formObj["status"])
	}
	if contractObj["status"] != "accepted" {
		t.Fatalf("contract=%v", contractObj["status"])
	}

	body2 := []byte(`{"currency":"USD","invoice_amount":"10","no_documents":true}`)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body2))
	req2.Header.Set("Authorization", "Bearer "+user)
	req2.Header.Set("Content-Type", "application/json")
	res2 := httptest.NewRecorder()
	core.ServeHTTP(res2, req2)
	var form2 map[string]any
	_ = json.Unmarshal(res2.Body.Bytes(), &form2)
	id2, _ := form2["id"].(string)

	resBad := httptest.NewRecorder()
	badBody, _ := json.Marshal(map[string]string{"on_behalf_organization_id": "", "contract_type": "subagency"})
	breq := httptest.NewRequest(http.MethodPut, "/api/v1/forms/"+id2+"/on-behalf", bytes.NewReader(badBody))
	breq.Header.Set("Authorization", "Bearer "+user)
	breq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(resBad, breq)
	if resBad.Code == http.StatusOK {
		t.Fatal("subagency empty on-behalf must fail")
	}

	orgList := getJSONList(t, core, manager, "/api/v1/admin/organizations/66666666-6666-6666-6666-666666666666/contracts")
	if len(orgList) == 0 {
		t.Fatal("org contracts history empty")
	}
}

func postAnyJSON(t *testing.T, h http.Handler, token, method, path string, payload map[string]any, want int) map[string]any {
	t.Helper()
	raw, _ := json.Marshal(payload)
	req := httptest.NewRequest(method, path, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != want {
		t.Fatalf("%s %s -> %d want %d %s", method, path, res.Code, want, res.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &out)
	return out
}

func getJSONList(t *testing.T, h http.Handler, token, path string) []any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("GET %s -> %d %s", path, res.Code, res.Body.String())
	}
	var out []any
	if err := json.Unmarshal(res.Body.Bytes(), &out); err != nil {
		t.Fatalf("list decode: %v body=%s", err, res.Body.String())
	}
	return out
}
