package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR7RefundHappyPathAndCancelInvariant(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	eco := login(t, core, "eco@vdp.local", "eco")

	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-R7","contract_date":"2026-01-01"}`)
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
	mustAttachInvoice(t, core, user, id)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	// cancel blocked
	mustStatus(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/cancel", nil, 409)

	// nest refund init + process API
	mustOK(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/refund/init", map[string]any{
		"amount": "1000", "currency": "USD", "comment": "return to client",
	})
	view := getJSON(t, core, manager, "/api/v1/forms/"+id+"/refund")
	if view["status"] != "payment_refund_waiting" {
		t.Fatalf("refund view=%#v", view)
	}
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/file", map[string]any{"file_id": "rf-1"})
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/refund/start", nil)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/sent", map[string]any{"comment": "done"})
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "payment_refund_sent" {
		t.Fatalf("status=%v", got["status"])
	}
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/cancel", nil)
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "canceled_by_manager" {
		t.Fatalf("after cancel status=%v", got["status"])
	}
}

func TestR7RefundMatrixRoutesDone(t *testing.T) {
	t.Parallel()
	var done, total int
	for _, row := range nestEndpointParity {
		if row.Module != "form-payment" && row.Module != "refund" {
			continue
		}
		if !bytes.Contains([]byte(row.NestPath), []byte("refund")) {
			continue
		}
		total++
		if row.Status == ParityDone {
			done++
		}
	}
	if total == 0 || float64(done)/float64(total)*100 < 95 {
		t.Fatalf("refund routes done=%d/%d", done, total)
	}
}

func TestR7RefundAuthZ(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	provider := login(t, core, "provider@vdp.local", "provider")
	treasurer := login(t, core, "treasurer@vdp.local", "treasurer")
	eco := login(t, core, "eco@vdp.local", "eco")

	// Create form and get to payment_received state with funds held
	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-R7-AUTHZ","contract_date":"2026-01-01"}`)
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
	mustAttachInvoice(t, core, user, id)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	// Test 1: User cannot init refund (403)
	mustStatus(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/refund/init", map[string]any{
		"amount": "1000", "currency": "USD",
	}, 403)

	// Test 2: Provider cannot init refund (403)
	mustStatus(t, core, provider, http.MethodPost, "/api/v1/forms/"+id+"/refund/init", map[string]any{
		"amount": "1000", "currency": "USD",
	}, 403)

	// Test 3: Manager CAN init refund (200)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id+"/refund/init", map[string]any{
		"amount": "1000", "currency": "USD",
	})

	// Test 4: User cannot start refund process (403)
	mustStatus(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/refund/start", nil, 403)

	// Test 5: Provider cannot start refund process (403)
	mustStatus(t, core, provider, http.MethodPost, "/api/v1/forms/"+id+"/refund/start", nil, 403)

	// Test 6: Manager CAN start refund process (200)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/start", nil)

	// Test 7: Treasurer CAN confirm refund sent (200)
	mustOK(t, core, treasurer, http.MethodPost, "/api/v1/forms/"+id+"/refund/sent", map[string]any{
		"comment": "refund completed",
	})

	// Verify final state
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "payment_refund_sent" {
		t.Fatalf("expected payment_refund_sent, got %v", got["status"])
	}
}

func TestR7RefundStopAndCancel(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	eco := login(t, core, "eco@vdp.local", "eco")

	// Create form and get to refund_processing state
	body := []byte(`{"currency":"EUR","invoice_amount":"500","no_documents":true,"contract_number":"C-R7-STOP","contract_date":"2026-01-01"}`)
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
	mustAttachInvoice(t, core, user, id)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	// Init refund and start processing
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/init", map[string]any{
		"amount": "500", "currency": "EUR",
	})
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/start", nil)

	// Verify refund_processing status
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "payment_refund_processing" {
		t.Fatalf("expected payment_refund_processing, got %v", got["status"])
	}

	// Test stop action
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/stop", nil)
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "payment_refund_waiting" {
		t.Fatalf("expected payment_refund_waiting after stop, got %v", got["status"])
	}

	// Test cancel action
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/cancel", nil)
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "signing_order_accepted" {
		t.Fatalf("expected signing_order_accepted after cancel, got %v", got["status"])
	}
}

func TestR7RefundInvariantBlocksCancelWithHeldFunds(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	eco := login(t, core, "eco@vdp.local", "eco")

	// Create form and get to payment_received with funds held
	body := []byte(`{"currency":"USD","invoice_amount":"2000","no_documents":true,"contract_number":"C-R7-INV","contract_date":"2026-01-01"}`)
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
	mustAttachInvoice(t, core, user, id)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	// Attempt to cancel while funds are held should fail with 409
	mustStatus(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/cancel", nil, 409)

	// Init and complete refund
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/init", map[string]any{
		"amount": "2000", "currency": "USD",
	})
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/start", nil)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/refund/sent", nil)

	// After refund sent, cancel should succeed
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/cancel", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "canceled_by_manager" {
		t.Fatalf("expected canceled_by_manager after refund, got %v", got["status"])
	}
}
