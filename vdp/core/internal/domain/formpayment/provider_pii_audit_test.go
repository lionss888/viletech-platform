package formpayment_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// TestProviderViewNoPII is a comprehensive Phase 2 security audit test that ensures
// ProviderView never contains client personal identifiable information.
func TestProviderViewNoPII(t *testing.T) {
	t.Parallel()

	// Create a form with PII fields that should NOT appear in Provider view
	form := formpayment.Form{
		ID:             "form-pii-test",
		AccountID:      "user-account-with-passport",
		OrganizationID: "org-with-sensitive-data",
		Status:         formpayment.StatusPaymentProcessing,
		Direction:      formpayment.DirectionImport,
		Kind:           formpayment.KindGood,
		InvoiceAmount:  "10000",
		Currency:       "USD",
		ProviderID:     "provider-123",
		ContractNumber: "CN-2024-001",
		// These fields contain PII and should never leak to provider
		InvoiceJSON:    `{"passport":"AB123456","phone":"+79991234567","email":"user@example.com"}`,
		DocsJSON:       formpayment.EncodeDocRefs([]formpayment.DocFileRef{
			{FileID: "invoice-file", Kind: "invoice", Label: "Invoice"},
			{FileID: "agency-contract-file", Kind: "contract", Label: "Agency Contract"},
			{FileID: "payment-proof", Kind: "payment", Label: "Payment Proof"},
		}, nil),
	}

	// Project to provider view
	view := formpayment.ProjectForProvider(form)

	// Test 1: ContainsPII must return false
	if formpayment.ContainsPII(view) {
		t.Error("ProviderView contains forbidden PII keys")
	}

	// Test 2: Serialize and check for PII keys manually
	raw, err := json.Marshal(view)
	if err != nil {
		t.Fatalf("failed to marshal ProviderView: %v", err)
	}
	viewJSON := strings.ToLower(string(raw))

	// These keys must NEVER appear in Provider JSON
	forbiddenKeys := []string{
		"passport", "phone", "full_name", "email", "account", "inn", 
		"address", "birth", "personal", "client_name", "user_name",
	}

	for _, key := range forbiddenKeys {
		if strings.Contains(viewJSON, `"`+key+`"`) {
			t.Errorf("ProviderView JSON contains forbidden PII key %q", key)
		}
	}

	// Test 3: Verify InvoiceJSON is NOT in the view (it's not a field in ProviderView)
	if strings.Contains(viewJSON, "invoice_json") {
		t.Error("ProviderView should not have invoice_json field")
	}

	// Test 4: Verify DocsJSON is scrubbed (agency contract should be removed)
	refs := formpayment.ParseDocRefs(view.DocsJSON)
	for _, ref := range refs {
		if formpayment.IsAgencyContractDocKind(ref.Kind, ref.Label) {
			t.Errorf("Agency contract leaked in Provider DocsJSON: %+v", ref)
		}
	}

	// Test 5: Only payment-related fields should be present
	allowedFields := map[string]bool{
		"id": true, "status": true, "direction": true, "kind": true,
		"channel": true, "execution_deadline": true, "invoice_amount": true,
		"currency": true, "rate": true, "commission": true, "provider_id": true,
		"organization_id": true, "active_order_id": true, "active_order": true,
		"docs_json": true, "confirmation_file_id": true, "confirmation_hash": true,
		"contract_number": true, "created_at": true, "updated_at": true,
	}

	var viewMap map[string]any
	_ = json.Unmarshal(raw, &viewMap)
	
	for key := range viewMap {
		if !allowedFields[key] {
			t.Errorf("ProviderView contains unexpected field %q that might be PII", key)
		}
	}

	// Test 6: organization_id is allowed (it's an ID, not PII like org name/address)
	// But verify it's just the ID, not expanded org details
	if view.OrganizationID != form.OrganizationID {
		t.Error("organization_id should be preserved")
	}
	// Verify there's no nested organization object with PII
	if strings.Contains(viewJSON, `"organization":{`) {
		t.Error("ProviderView should not contain expanded organization object with potential PII")
	}
}

// TestProviderViewWithOrderNoPII verifies ProjectForProviderWithOrder also scrubs PII.
func TestProviderViewWithOrderNoPII(t *testing.T) {
	t.Parallel()

	form := formpayment.Form{
		ID:             "form-order-test",
		AccountID:      "user-123",
		Status:         formpayment.StatusPaymentProcessing,
		InvoiceJSON:    `{"client_passport":"XX999999"}`,
		DocsJSON:       formpayment.EncodeDocRefs([]formpayment.DocFileRef{
			{FileID: "contract", Kind: "contract", Label: "Agency"},
		}, nil),
	}

	order := &formpayment.Order{
		ID:             "order-1",
		FormPaymentID:  form.ID,
		InvoiceAmount:  "5000",
		Currency:       "EUR",
	}

	view := formpayment.ProjectForProviderWithOrder(form, order)

	if formpayment.ContainsPII(view) {
		t.Error("ProviderView with order contains PII")
	}

	// Verify order details don't leak PII
	raw, _ := json.Marshal(view)
	viewJSON := strings.ToLower(string(raw))
	
	if strings.Contains(viewJSON, "passport") || strings.Contains(viewJSON, "client") {
		t.Error("ProviderView with order contains client PII")
	}

	// Verify agency contract is scrubbed even with order
	refs := formpayment.ParseDocRefs(view.DocsJSON)
	if len(refs) > 0 {
		t.Errorf("Agency contract should be scrubbed, got %d docs", len(refs))
	}
}

// TestScrubFormForProviderClearsPII verifies ScrubFormForProvider removes sensitive fields.
func TestScrubFormForProviderClearsPII(t *testing.T) {
	t.Parallel()

	form := formpayment.Form{
		ID:          "form-scrub-test",
		AccountID:   "user-with-passport",
		InvoiceJSON: `{"passport":"YY123456","full_name":"John Doe","phone":"+1234567890"}`,
		DocsJSON: formpayment.EncodeDocRefs([]formpayment.DocFileRef{
			{FileID: "invoice", Kind: "invoice", Label: "Invoice"},
			{FileID: "agency-doc", Kind: "contract", Label: "Agency Agreement"},
			{FileID: "payment", Kind: "payment", Label: "Payment Slip"},
		}, nil),
	}

	scrubbed := formpayment.ScrubFormForProvider(form)

	// InvoiceJSON must be cleared (it often contains HS codes + client details)
	if scrubbed.InvoiceJSON != "" {
		t.Error("InvoiceJSON should be empty after scrubbing")
	}

	// Agency contract must be removed from docs
	refs := formpayment.ParseDocRefs(scrubbed.DocsJSON)
	for _, ref := range refs {
		if formpayment.IsAgencyContractDocKind(ref.Kind, ref.Label) {
			t.Errorf("Agency document should be scrubbed: %+v", ref)
		}
	}

	// Only deal documents should remain (invoice + payment)
	if len(refs) != 2 {
		t.Errorf("Expected 2 deal documents after scrubbing, got %d", len(refs))
	}
}

// TestProviderDTOInAPIResponse simulates an HTTP response to verify no PII leaks.
func TestProviderDTOInAPIResponse(t *testing.T) {
	t.Parallel()

	// Simulate a real form with all possible PII fields
	form := formpayment.Form{
		ID:             "api-response-test",
		AccountID:      "user-account-id",
		OrganizationID: "org-id-123",
		Status:         formpayment.StatusPaymentProcessing,
		Direction:      formpayment.DirectionImport,
		Currency:       "USD",
		InvoiceAmount:  "25000",
		ProviderID:     "provider-assigned",
		// Sensitive data that must not leak
		InvoiceJSON:    `{"client_passport":"AB123456","shipper_phone":"+79991234567","consignee_email":"client@example.com"}`,
		ContractNumber: "CN-2024-100",
		DocsJSON: formpayment.EncodeDocRefs([]formpayment.DocFileRef{
			{FileID: "invoice-id", Kind: "invoice", Label: "Commercial Invoice"},
			{FileID: "passport-copy", Kind: "identity", Label: "Client Passport"},
			{FileID: "agency-contract", Kind: "contract", Label: "Agency Service Agreement"},
		}, nil),
	}

	// Create provider view (as would be returned by API)
	view := formpayment.ProjectForProvider(form)

	// Serialize to JSON (as HTTP response would)
	responseJSON, err := json.MarshalIndent(view, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal response: %v", err)
	}

	responseStr := string(responseJSON)

	// Critical security checks
	forbiddenStrings := []string{
		"passport", "AB123456", // Passport number
		"shipper_phone", "+79991234567", // Phone number
		"consignee_email", "client@example.com", // Email
		"identity", // Identity document kind
		"Client Passport", // Identity document label
		"invoice_json", // The whole InvoiceJSON field
		"user-account-id", // AccountID should not be in provider view
	}

	for _, forbidden := range forbiddenStrings {
		if strings.Contains(responseStr, forbidden) {
			t.Errorf("Provider API response contains forbidden string %q:\n%s", forbidden, responseStr)
		}
	}

	// Allowed strings (payment-related, not PII)
	requiredStrings := []string{
		"api-response-test", // form ID
		"provider-assigned", // provider ID
		"USD", // currency
		"25000", // amount
	}

	for _, required := range requiredStrings {
		if !strings.Contains(responseStr, required) {
			t.Errorf("Provider API response missing required field %q", required)
		}
	}
}
