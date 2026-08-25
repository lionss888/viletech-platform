package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR1SmokeCreateDraftICOECOManagerOrder(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	ico := login(t, core, "ico@vdp.local", "ico")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")

	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-R1","contract_date":"2026-01-01"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != http.StatusCreated && res.Code != http.StatusOK {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)
	if id == "" {
		t.Fatal("missing id")
	}

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustStatus(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil, 200)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)

	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "signing_order_accepted" {
		t.Fatalf("status=%v want signing_order_accepted", got["status"])
	}

	// count endpoint
	countRes := httptest.NewRecorder()
	creq := httptest.NewRequest(http.MethodGet, "/api/v1/manager/form-payment/count", nil)
	creq.Header.Set("Authorization", "Bearer "+manager)
	core.ServeHTTP(countRes, creq)
	if countRes.Code != 200 {
		t.Fatalf("count %d", countRes.Code)
	}
}

func TestR1ForbiddenRoleAndConflictTransition(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	provider := login(t, core, "provider@vdp.local", "provider")
	body := []byte(`{"currency":"USD","invoice_amount":"10","no_documents":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)
	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)

	// wrong role on nest path → 403
	res = httptest.NewRecorder()
	preq := httptest.NewRequest(http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", bytes.NewReader([]byte("{}")))
	preq.Header.Set("Authorization", "Bearer "+provider)
	preq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, preq)
	if res.Code != http.StatusForbidden {
		t.Fatalf("provider on eco path want 403 got %d %s", res.Code, res.Body.String())
	}

	// illegal transition → 409
	res = httptest.NewRecorder()
	mreq := httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/sent", bytes.NewReader([]byte("{}")))
	mreq.Header.Set("Authorization", "Bearer "+login(t, core, "manager@vdp.local", "manager"))
	mreq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, mreq)
	if res.Code != http.StatusConflict && res.Code != http.StatusBadRequest {
		t.Fatalf("illegal transition want 409/400 got %d %s", res.Code, res.Body.String())
	}
}

func mustOK(t *testing.T, h http.Handler, token, method, path string, body any) {
	t.Helper()
	mustStatus(t, h, token, method, path, body, 200)
}

func mustStatus(t *testing.T, h http.Handler, token, method, path string, body any, want int) {
	t.Helper()
	var rdr *bytes.Reader
	if body == nil {
		rdr = bytes.NewReader([]byte("{}"))
	} else {
		raw, _ := json.Marshal(body)
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != want && !(want == 200 && res.Code == http.StatusCreated) {
		t.Fatalf("%s %s -> %d want %d %s", method, path, res.Code, want, res.Body.String())
	}
}

func getJSON(t *testing.T, h http.Handler, token, path string) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("GET %s -> %d %s", path, res.Code, res.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &out)
	return out
}
