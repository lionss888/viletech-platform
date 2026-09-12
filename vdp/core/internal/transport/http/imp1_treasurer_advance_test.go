package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIMP1TreasurerConfirmImportAdvance(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")
	root := login(t, core, "root@vdp.local", "root")

	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-IMP1","contract_date":"2026-01-01"}`)
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
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPatch, "/api/v1/manager/form-payment/"+id, map[string]string{
		"payment_method": "advance",
	})
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	deadline := time.Now().UTC().Add(48 * time.Hour).Format(time.RFC3339)
	mustOK(t, core, root, http.MethodPatch, "/api/v1/treasurer/form-payment/"+id+"/confirm-payment", map[string]string{
		"execution_deadline": deadline,
	})
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "payment_processing" {
		t.Fatalf("status=%v want payment_processing", got["status"])
	}
	if got["execution_deadline"] == nil || got["execution_deadline"] == "" {
		t.Fatalf("execution_deadline missing: %#v", got["execution_deadline"])
	}
}

func TestIMP1TreasurerConfirmForbiddenForManager(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")

	body := []byte(`{"currency":"USD","invoice_amount":"50","no_documents":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPatch, "/api/v1/manager/form-payment/"+id, map[string]string{"payment_method": "advance"})
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	mustStatus(t, core, manager, http.MethodPatch, "/api/v1/treasurer/form-payment/"+id+"/confirm-payment", nil, http.StatusForbidden)
}

func TestIMP1TreasurerConfirmExportUnchanged(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")
	root := login(t, core, "root@vdp.local", "root")

	body := []byte(`{"currency":"USD","invoice_amount":"200","no_documents":true,"direction":"export"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPatch, "/api/v1/manager/form-payment/"+id, map[string]string{
		"payment_method": "PAY_FROM_EXPORT",
	})
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/start", nil)

	mustOK(t, core, root, http.MethodPatch, "/api/v1/treasurer/form-payment/"+id+"/confirm-payment", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "payment_sent_treasurer" {
		t.Fatalf("status=%v want payment_sent_treasurer", got["status"])
	}
}
