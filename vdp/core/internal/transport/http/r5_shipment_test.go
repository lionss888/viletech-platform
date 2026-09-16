package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func seedShipmentReadyForm(t *testing.T, core http.Handler, user, manager, eco string) string {
	t.Helper()
	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-SHIP","contract_date":"2026-01-01"}`)
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
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	return id
}

func TestR5ShipmentAuthZ(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	provider := login(t, core, "provider@vdp.local", "provider")
	eco := login(t, core, "eco@vdp.local", "eco")
	id := seedShipmentReadyForm(t, core, user, manager, eco)

	mustStatus(t, core, user, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/shipment/waiting", nil, 403)
	mustStatus(t, core, provider, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/shipment/waiting", nil, 403)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/shipment/waiting", nil)

	mustStatus(t, core, provider, http.MethodPut, "/api/v1/site/form-payment/"+id+"/shipment", nil, 403)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/shipment", nil)

	mustStatus(t, core, user, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/start", nil, 403)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/start", nil)
}

func TestR5ShipmentRejectStopAndUserAccept(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	eco := login(t, core, "eco@vdp.local", "eco")
	id := seedShipmentReadyForm(t, core, user, manager, eco)

	mustOK(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/shipment/waiting", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/shipment", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/start", nil)

	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/stop", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "shipment_waiting_verification" {
		t.Fatalf("after stop status=%v", got["status"])
	}

	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/reject", map[string]any{
		"reason": "docs incomplete",
	})
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "shipment_waiting_corrections" {
		t.Fatalf("after reject status=%v", got["status"])
	}

	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/shipment", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/start", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/shipment/accept", nil)
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "completed" {
		t.Fatalf("after user accept status=%v", got["status"])
	}
}

func TestR5ReportAcceptCompletesWithoutShipment(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	eco := login(t, core, "eco@vdp.local", "eco")
	provider := login(t, core, "provider@vdp.local", "provider")
	id := seedShipmentReadyForm(t, core, user, manager, eco)

	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/provider", map[string]any{
		"provider_id": "55555555-5555-5555-5555-555555555555", "client_agreed": true,
	})
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/start", nil)
	mustOK(t, core, provider, http.MethodPut, "/api/v1/provider/form-payment/"+id+"/payment/sent", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/report/signing", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/report/accept", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "completed" {
		t.Fatalf("report accept without shipment status=%v", got["status"])
	}
}
