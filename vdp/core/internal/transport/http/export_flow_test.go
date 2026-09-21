package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// TestExportFormCreation tests creating a form with direction=export.
func TestExportFormCreation(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)

	user := login(t, core, "user@vdp.local", "user")

	// Create export form
	body, _ := json.Marshal(map[string]any{
		"direction":      "export",
		"kind":           "good",
		"currency":       "USD",
		"invoice_amount": "5000",
		"payment_method": "PAY_FROM_EXPORT",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	rr := httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusCreated {
		t.Fatalf("expected 200 or 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var form formpayment.Form
	if err := json.NewDecoder(rr.Body).Decode(&form); err != nil {
		t.Fatalf("decode form: %v", err)
	}

	if form.Direction != formpayment.DirectionExport {
		t.Errorf("expected export direction, got %s", form.Direction)
	}
	if form.PaymentMethod != formpayment.PaymentMethodPayFromExport {
		t.Errorf("expected PAY_FROM_EXPORT, got %s", form.PaymentMethod)
	}
	if form.Status != formpayment.StatusCreating {
		t.Errorf("expected creating status, got %s", form.Status)
	}
}

// TestExportHappyPathHTTP tests the full export money path via HTTP API with PAY_FROM_EXPORT.
func TestExportHappyPathHTTP(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)

	user := login(t, core, "user@vdp.local", "user")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")
	treasurer := login(t, core, "treasurer@vdp.local", "treasurer")

	// 1. User creates export form with PAY_FROM_EXPORT
	createBody, _ := json.Marshal(map[string]any{
		"direction":      "export",
		"kind":           "good",
		"currency":       "USD",
		"invoice_amount": "10000",
		"payment_method": "PAY_FROM_EXPORT",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(createBody))
	req.Header.Set("Authorization", "Bearer "+user)
	rr := httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusCreated {
		t.Fatalf("create form: expected 200 or 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var form formpayment.Form
	_ = json.NewDecoder(rr.Body).Decode(&form)
	formID := form.ID

	// 2. User recognizes (CREATING → DRAFT)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/forms/"+formID+"/actions/recognize_complete", nil)
	req.Header.Set("Authorization", "Bearer "+user)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("recognize: expected 200, got %d", rr.Code)
	}

	// 3. User submits (DRAFT → FORM_WAITING_VERIFICATION, assuming org approved)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/site/form-payment/"+formID+"/form/accept", nil)
	req.Header.Set("Authorization", "Bearer "+user)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("submit: expected 200, got %d", rr.Code)
	}

	// 4. ECO starts verification
	req = httptest.NewRequest(http.MethodPut, "/api/v1/eco/form-payment/"+formID+"/form/start", nil)
	req.Header.Set("Authorization", "Bearer "+eco)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("eco start: expected 200, got %d", rr.Code)
	}

	// 5. ECO accepts
	mustAttachInvoice(t, core, user, formID)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/eco/form-payment/"+formID+"/form/accept", nil)
	req.Header.Set("Authorization", "Bearer "+eco)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("eco accept: expected 200, got %d", rr.Code)
	}

	// 6. Manager initiates advance signing (export-specific)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/order-advance/signing", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("advance signing: expected 200, got %d", rr.Code)
	}

	// 7. User uploads advance order
	req = httptest.NewRequest(http.MethodPut, "/api/v1/site/form-payment/"+formID+"/order-advance", nil)
	req.Header.Set("Authorization", "Bearer "+user)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("advance upload: expected 200, got %d", rr.Code)
	}

	// 8. Manager starts advance verification
	req = httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/order-advance/start", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("advance start: expected 200, got %d", rr.Code)
	}

	// 9. Manager accepts advance
	req = httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/order-advance/accept", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("advance accept: expected 200, got %d", rr.Code)
	}

	// 10. Manager marks payment received (export: client receives from counterparty)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/payment/received", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("payment received: expected 200, got %d", rr.Code)
	}

	// 11. Manager starts payment processing
	req = httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/payment/start", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("payment start: expected 200, got %d", rr.Code)
	}

	// 12. Treasurer confirms payment (PAY_FROM_EXPORT: triggers treasurer flow)
	req = httptest.NewRequest(http.MethodPatch, "/api/v1/treasurer/form-payment/"+formID+"/confirm-payment", nil)
	req.Header.Set("Authorization", "Bearer "+treasurer)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("treasurer confirm: expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	_ = json.NewDecoder(rr.Body).Decode(&form)
	if form.Status != formpayment.StatusPaymentSentTreasurer {
		t.Fatalf("after treasurer confirm: expected payment_sent_treasurer, got %s", form.Status)
	}

	// 13. Treasurer initiates signing order
	req = httptest.NewRequest(http.MethodPut, "/api/v1/treasurer/form-payment/"+formID+"/signing-order-treasurer", nil)
	req.Header.Set("Authorization", "Bearer "+treasurer)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("treasurer signing: expected 200, got %d", rr.Code)
	}

	// 14. User uploads treasurer verification doc
	req = httptest.NewRequest(http.MethodPut, "/api/v1/site/form-payment/"+formID+"/signing-order-verification-treasurer", nil)
	req.Header.Set("Authorization", "Bearer "+user)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("treasurer user verify: expected 200, got %d", rr.Code)
	}

	// 15. Treasurer completes (export PAY_FROM_EXPORT can complete directly)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/treasurer/form-payment/"+formID+"/complete-from-verification-treasurer", nil)
	req.Header.Set("Authorization", "Bearer "+treasurer)
	rr = httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("treasurer complete: expected 200, got %d", rr.Code)
	}

	_ = json.NewDecoder(rr.Body).Decode(&form)
	if form.Status != formpayment.StatusCompleted {
		t.Fatalf("after treasurer complete: expected completed, got %s", form.Status)
	}
}

// TestExportTreasurerAuthZ tests that non-treasurer roles cannot perform treasurer actions on export.
func TestExportTreasurerAuthZ(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)

	user := login(t, core, "user@vdp.local", "user")
	manager := login(t, core, "manager@vdp.local", "manager")
	provider := login(t, core, "provider@vdp.local", "provider")

	// Create and prepare an export form to payment_processing status
	formID := createExportFormAtStatus(t, core, formpayment.StatusPaymentProcessing, formpayment.PaymentMethodPayFromExport)

	tests := []struct {
		name  string
		token string
		path  string
		role  domain.Role
	}{
		{"user cannot treasurer confirm", user, "/api/v1/site/form-payment/" + formID + "/confirm-payment", domain.RoleUser},
		{"manager cannot treasurer confirm", manager, "/api/v1/manager/form-payment/" + formID + "/confirm-payment", domain.RoleManager},
		{"provider cannot treasurer confirm", provider, "/api/v1/provider/form-payment/" + formID + "/confirm-payment", domain.RoleProvider},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			req := httptest.NewRequest(http.MethodPatch, tc.path, nil)
			req.Header.Set("Authorization", "Bearer "+tc.token)
			rr := httptest.NewRecorder()
			core.ServeHTTP(rr, req)

			// Should get 403 Forbidden, not 500 or 200
			if rr.Code != http.StatusForbidden {
				t.Errorf("expected 403, got %d: %s", rr.Code, rr.Body.String())
			}
		})
	}
}

// TestExportInvalidTransitions tests that invalid export transitions are rejected.
func TestExportInvalidTransitions(t *testing.T) {
	t.Parallel()
	core, _, _ := newStack(t)

	manager := login(t, core, "manager@vdp.local", "manager")

	// Create export form at draft
	formID := createExportFormAtStatus(t, core, formpayment.StatusDraft, "")

	// Try to jump directly to payment_sent (should fail)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/payment/sent", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	rr := httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	if rr.Code == http.StatusOK {
		t.Errorf("should not allow draft -> payment_sent direct transition")
	}
}

// Helper: create an export form at a specific status for testing.
func createExportFormAtStatus(t *testing.T, core http.Handler, targetStatus formpayment.Status, paymentMethod string) string {
	t.Helper()
	user := login(t, core, "user@vdp.local", "user")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")

	// Create form
	createBody, _ := json.Marshal(map[string]any{
		"direction":      "export",
		"kind":           "good",
		"currency":       "USD",
		"invoice_amount": "1000",
		"payment_method": paymentMethod,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(createBody))
	req.Header.Set("Authorization", "Bearer "+user)
	rr := httptest.NewRecorder()
	core.ServeHTTP(rr, req)

	var form formpayment.Form
	_ = json.NewDecoder(rr.Body).Decode(&form)
	formID := form.ID

	// Walk through transitions to reach target status
	if targetStatus == formpayment.StatusCreating {
		return formID
	}

	// CREATING -> DRAFT
	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+formID+"/actions/recognize_complete", nil)

	if targetStatus == formpayment.StatusDraft {
		return formID
	}

	// DRAFT -> FORM_WAITING_VERIFICATION (assuming org approved)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+formID+"/form/accept", nil)
	
	if targetStatus == formpayment.StatusFormWaitingVerification {
		return formID
	}

	// Continue to FORM_VERIFICATION -> FORM_ACCEPTED
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+formID+"/form/start", nil)
	mustAttachInvoice(t, core, user, formID)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+formID+"/form/accept", nil)

	if targetStatus == formpayment.StatusFormAccepted {
		return formID
	}

	// Continue to advance flow for payment_processing
	if targetStatus == formpayment.StatusPaymentProcessing {
		mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/order-advance/signing", nil)
		mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+formID+"/order-advance", nil)
		mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/order-advance/start", nil)
		mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/order-advance/accept", nil)
		mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/payment/received", nil)
		mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+formID+"/payment/start", nil)
		return formID
	}

	return formID
}
