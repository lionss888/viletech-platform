package formpayment_test

import (
	"encoding/json"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
)

// Ensures optional counterparty fields round-trip in JSON (wizard/API contract).
func TestCounterpartyOptionalFieldsJSON(t *testing.T) {
	t.Parallel()
	raw, err := json.Marshal(domain.Counterparty{
		ID:                 "cp-1",
		Name:               "Supplier LLC",
		RegistrationNumber: "REG-99",
		LegalAddress:       "Moscow, Test 1",
	})
	if err != nil {
		t.Fatal(err)
	}
	var got domain.Counterparty
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	if got.RegistrationNumber != "REG-99" {
		t.Fatalf("registration_number=%q", got.RegistrationNumber)
	}
	if got.LegalAddress != "Moscow, Test 1" {
		t.Fatalf("legal_address=%q", got.LegalAddress)
	}
	if err := domain.ValidateCounterparty(got); err != nil {
		t.Fatal(err)
	}
}
