package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/core/internal/repository/seed"
)

func TestIMP2PostpayAutoModeAndTreasurerConfirm(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")
	root := login(t, core, "root@vdp.local", "root")
	provider := login(t, core, "provider@vdp.local", "provider")

	body := []byte(`{"currency":"USD","invoice_amount":"1500","no_documents":true,"payment_method":"post_payment","contract_number":"C-IMP2","contract_date":"2026-02-01"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != http.StatusCreated && res.Code != http.StatusOK {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatal("missing id")
	}
	if created["platform_postpay_mode"] != "POSTPAY_RATE_ON_PP" {
		t.Fatalf("auto mode=%v want POSTPAY_RATE_ON_PP", created["platform_postpay_mode"])
	}
	if created["rate_on_provider"] != true {
		t.Fatalf("rate_on_provider=%v want true", created["rate_on_provider"])
	}

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/provider", map[string]any{
		"provider_id": seed.ProviderID, "client_agreed": true,
	})

	// Provider-first: no client RUB before provider send.
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/start", nil)
	mustOK(t, core, provider, http.MethodPut, "/api/v1/provider/form-payment/"+id+"/payment/sent", nil)

	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/rate", map[string]string{
		"value": "95.5", "currency": "USD", "source": "manual",
	})
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/commission", map[string]string{
		"fee_percent": "1.5", "fee_currency": "USD",
	})
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order-advance/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order-advance", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order-advance/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order-advance/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)

	mustOK(t, core, root, http.MethodPatch, "/api/v1/treasurer/form-payment/"+id+"/confirm-payment", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "report_waiting" {
		t.Fatalf("status=%v want report_waiting", got["status"])
	}
}

func TestIMP2PatchPostPaymentSetsMode(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")

	body := []byte(`{"currency":"EUR","invoice_amount":"100","no_documents":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	var created map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPatch, "/api/v1/manager/form-payment/"+id, map[string]string{
		"payment_method": "post_payment",
	})
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["platform_postpay_mode"] != "POSTPAY_RATE_ON_PP" {
		t.Fatalf("mode=%v after patch", got["platform_postpay_mode"])
	}
}
