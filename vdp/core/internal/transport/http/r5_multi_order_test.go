package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR5MultiOrderAndProviderActive(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	ico := login(t, core, "ico@vdp.local", "ico")
	eco := login(t, core, "eco@vdp.local", "eco")
	provider := login(t, core, "provider@vdp.local", "provider")

	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-R5","contract_date":"2026-01-01"}`)
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

	// main order lifecycle
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)

	orders := getJSON(t, core, manager, "/api/v1/forms/"+id+"/orders")
	items, _ := orders["items"].([]any)
	if len(items) < 1 {
		t.Fatalf("want main order, got %#v", orders)
	}
	active := getJSON(t, core, manager, "/api/v1/forms/"+id+"/orders/active")
	if active["kind"] != "main" {
		t.Fatalf("active kind=%v", active["kind"])
	}
	mainID, _ := active["id"].(string)

	// advance order
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order-advance/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order-advance", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order-advance/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order-advance/accept", nil)

	orders = getJSON(t, core, manager, "/api/v1/forms/"+id+"/orders")
	items, _ = orders["items"].([]any)
	if len(items) < 2 {
		t.Fatalf("want 2 orders got %d %#v", len(items), orders)
	}
	active = getJSON(t, core, manager, "/api/v1/forms/"+id+"/orders/active")
	if active["kind"] != "advance" {
		t.Fatalf("active after advance=%v", active)
	}
	if active["id"] == mainID {
		t.Fatal("active order should switch to advance")
	}

	// assign provider and check provider view has active only (no PII fields)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/provider", map[string]any{
		"provider_id": "55555555-5555-5555-5555-555555555555", "client_agreed": true,
	})
	view := getJSON(t, core, provider, "/api/v1/provider/form-payment/"+id+"/active-order")
	if view["active_order"] == nil && view["active_order_id"] == "" {
		t.Fatalf("provider view missing active order: %#v", view)
	}
	raw, _ := json.Marshal(view)
	if bytes.Contains(raw, []byte("passport")) || bytes.Contains(raw, []byte("phone")) {
		t.Fatalf("provider view leaked PII: %s", raw)
	}
	ao, _ := view["active_order"].(map[string]any)
	if ao != nil && ao["kind"] != "advance" {
		t.Fatalf("provider active_order=%v", ao)
	}

	// shipment branch
	mustOK(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/shipment/waiting", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "shipment_waiting" {
		t.Fatalf("shipment status=%v", got["status"])
	}
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/shipment", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/shipment/accept", nil)
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "completed" {
		t.Fatalf("after shipment accept status=%v", got["status"])
	}
}

func TestR5MultiOrderMatrixAdvanceRoutesDone(t *testing.T) {
	t.Parallel()
	var done, total int
	for _, row := range nestEndpointParity {
		if row.Module != "form-payment" {
			continue
		}
		if !(contains(row.NestPath, "order-advance") || contains(row.NestPath, "shipment")) {
			continue
		}
		total++
		if row.Status == ParityDone {
			done++
		}
	}
	if total == 0 {
		t.Fatal("no advance/shipment routes in matrix")
	}
	pct := float64(done) / float64(total) * 100
	if pct < 95 {
		t.Fatalf("order-advance/shipment done=%.1f%% want >=95", pct)
	}
}

func contains(s, sub string) bool {
	return bytes.Contains([]byte(s), []byte(sub))
}
