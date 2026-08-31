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
	ico := login(t, core, "ico@vdp.local", "ico")
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
	mustOK(t, core, ico, http.MethodPut, "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
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
