package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIMP3CommissionRewardModes(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")

	body := []byte(`{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"C-IMP3","contract_date":"2026-03-01"}`)
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

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)

	t.Run("legacy_percent", func(t *testing.T) {
		mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/commission", map[string]string{
			"fee_percent": "1.5", "fee_currency": "USD",
		})
		got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
		comm, _ := got["commission"].(map[string]any)
		if comm["reward_mode"] != "percent" {
			t.Fatalf("reward_mode=%v", comm["reward_mode"])
		}
		if comm["fee_amount"] != "15.00" {
			t.Fatalf("fee_amount=%v", comm["fee_amount"])
		}
	})

	t.Run("fixed", func(t *testing.T) {
		mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/commission", map[string]string{
			"reward_mode": "fixed", "fee_fix": "40", "fee_currency": "USD",
		})
		got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
		comm, _ := got["commission"].(map[string]any)
		if comm["reward_mode"] != "fixed" || comm["fee_amount"] != "40.00" {
			t.Fatalf("commission=%v", comm)
		}
	})

	t.Run("percent_plus_fixed", func(t *testing.T) {
		mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/commission", map[string]string{
			"reward_mode": "percent_plus_fixed", "fee_percent": "1.5", "fee_fix": "10", "fee_currency": "USD",
		})
		got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
		comm, _ := got["commission"].(map[string]any)
		if comm["reward_mode"] != "percent_plus_fixed" {
			t.Fatalf("reward_mode=%v", comm["reward_mode"])
		}
		if comm["fee_amount"] != "25.00" {
			t.Fatalf("fee_amount=%v", comm["fee_amount"])
		}
		if comm["fee_fix"] != "10.00" {
			t.Fatalf("fee_fix=%v", comm["fee_fix"])
		}
	})

	t.Run("fixed_missing_returns_400", func(t *testing.T) {
		raw, _ := json.Marshal(map[string]string{
			"reward_mode": "fixed", "fee_currency": "USD",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/forms/"+id+"/commission", bytes.NewReader(raw))
		req.Header.Set("Authorization", "Bearer "+manager)
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		core.ServeHTTP(res, req)
		if res.Code != http.StatusBadRequest && res.Code != http.StatusUnprocessableEntity {
			t.Fatalf("status=%d want 400/422 body=%s", res.Code, res.Body.String())
		}
	})
}
