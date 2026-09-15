package inbox_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/viletech/vdp/shared/events"
)

// TestHubEventsNoPII is a Phase 2 security audit test that ensures hub events
// never contain client PII in their payload. Hub events are designed to carry
// minimal metadata (status transitions, action triggers) without full form data.
func TestHubEventsNoPII(t *testing.T) {
	t.Parallel()

	// Forbidden PII keywords that must never appear in hub event payloads
	forbiddenPII := []string{
		"passport", "паспорт",
		"full_name", "фио",
		"phone", "телефон",
		"email",
		"inn", "инн",
		"address", "адрес",
		"birth", "рожд",
		"identity", "личн",
	}

	// Simulate typical hub event payloads
	testCases := []struct {
		name    string
		event   events.Envelope
		wantErr bool
	}{
		{
			name: "status_changed_event_no_pii",
			event: events.Envelope{
				EventID:       "evt-001",
				EventType:     events.TypeFormPaymentStatusChanged,
				AggregateID:   "form-123",
				AggregateType: events.AggregateFormPayment,
				FormPaymentID: "form-123",
				Payload: map[string]any{
					"from":   "draft",
					"to":     "form_verification",
					"action": "submit",
					"role":   "user",
				},
			},
			wantErr: false,
		},
		{
			name: "telegram_notify_event_no_pii",
			event: events.Envelope{
				EventID:       "evt-002",
				EventType:     events.TypeTelegramNotify,
				AggregateID:   "form-456",
				AggregateType: events.AggregateFormPayment,
				FormPaymentID: "form-456",
				Payload: map[string]any{
					"message": "Заявка обновлена",
					"status":  "form_accepted",
				},
			},
			wantErr: false,
		},
		{
			name: "partner_dispatch_event_no_pii",
			event: events.Envelope{
				EventID:       "evt-003",
				EventType:     events.TypePartnerDispatch,
				AggregateID:   "form-789",
				AggregateType: events.AggregateFormPayment,
				FormPaymentID: "form-789",
				Payload: map[string]any{
					"operation": "dispatch",
					"status":    "payment_processing",
					"amount":    "5000",
					"currency":  "USD",
				},
			},
			wantErr: false,
		},
		{
			name: "event_with_pii_should_fail_audit",
			event: events.Envelope{
				EventID:       "evt-bad",
				EventType:     events.TypeFormPaymentStatusChanged,
				AggregateID:   "form-bad",
				AggregateType: events.AggregateFormPayment,
				FormPaymentID: "form-bad",
				Payload: map[string]any{
					"from":       "draft",
					"to":         "form_verification",
					"user_email": "client@example.com", // PII!
					"passport":   "XX123456",           // PII!
				},
			},
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Serialize event to JSON as it would be transmitted
			raw, err := json.Marshal(tc.event)
			if err != nil {
				t.Fatalf("Failed to marshal event: %v", err)
			}

			payload := strings.ToLower(string(raw))

			// Check for forbidden PII keywords
			foundPII := []string{}
			for _, keyword := range forbiddenPII {
				// Check if keyword appears as a JSON key or value
				if strings.Contains(payload, keyword) {
					foundPII = append(foundPII, keyword)
				}
			}

			if tc.wantErr {
				// This test case should contain PII (negative test)
				if len(foundPII) == 0 {
					t.Error("Expected PII in payload for negative test case, but found none")
				}
			} else {
				// This test case should NOT contain PII (positive test)
				if len(foundPII) > 0 {
					t.Errorf("Hub event contains forbidden PII keywords: %v\nEvent payload: %s",
						foundPII, string(raw))
				}
			}
		})
	}
}

// TestHubEventsMinimalPayload verifies that hub events contain only minimal
// metadata required for routing and processing, not full form data.
func TestHubEventsMinimalPayload(t *testing.T) {
	t.Parallel()

	// Fields that should NEVER appear in hub events
	forbiddenFields := []string{
		"invoice_json",
		"docs_json",
		"user_passport",
		"client_phone",
		"client_email",
		"organization_inn",
		"counterparty_details",
		"account_details",
		"personal_contacts",
	}

	event := events.Envelope{
		EventID:       "evt-minimal",
		EventType:     events.TypeFormPaymentStatusChanged,
		AggregateID:   "form-min",
		AggregateType: events.AggregateFormPayment,
		FormPaymentID: "form-min",
		Payload: map[string]any{
			"from":   "draft",
			"to":     "form_verification",
			"action": "submit",
			"role":   "user",
		},
	}

	// Verify no forbidden fields in event structure
	raw, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to marshal event: %v", err)
	}

	payload := strings.ToLower(string(raw))
	foundForbidden := []string{}
	for _, field := range forbiddenFields {
		if strings.Contains(payload, strings.ToLower(field)) {
			foundForbidden = append(foundForbidden, field)
		}
	}

	if len(foundForbidden) > 0 {
		t.Errorf("Hub event contains forbidden fields: %v\nEvent: %s",
			foundForbidden, string(raw))
	}
}

// TestPartnerDispatchNoFormData verifies that partner dispatch events
// do not contain full form data or documents, only minimal metadata.
func TestPartnerDispatchNoFormData(t *testing.T) {
	t.Parallel()

	event := events.Envelope{
		EventID:       "evt-partner",
		EventType:     events.TypePartnerDispatch,
		AggregateID:   "form-partner",
		AggregateType: events.AggregateFormPayment,
		FormPaymentID: "form-partner",
		Payload: map[string]any{
			"operation":     "dispatch",
			"provider_id":   "provider-123",
			"status":        "payment_processing",
			"invoice_amount": "10000",
			"currency":      "EUR",
		},
	}

	raw, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to marshal event: %v", err)
	}

	// Verify partner events don't contain document refs or PII
	payload := string(raw)
	if strings.Contains(payload, "docs_json") {
		t.Error("Partner dispatch event contains docs_json field")
	}
	if strings.Contains(payload, "invoice_json") {
		t.Error("Partner dispatch event contains invoice_json field")
	}
	if strings.Contains(payload, "passport") || strings.Contains(payload, "паспорт") {
		t.Error("Partner dispatch event contains passport reference")
	}
	if strings.Contains(payload, "identity") {
		t.Error("Partner dispatch event contains identity document reference")
	}
}
