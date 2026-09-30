package domain_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
)

func TestValidateCounterparty_OptionalFields(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		input   domain.Counterparty
		wantErr bool
	}{
		{
			name: "all fields present",
			input: domain.Counterparty{
				Name:               "Supplier LLC",
				Country:            "CN",
				INN:                "123",
				RegistrationNumber: "91310000MA1K3XXXXX",
				LegalAddress:       "Shanghai, 123 Main St",
			},
			wantErr: false,
		},
		{
			name: "optional fields empty",
			input: domain.Counterparty{
				Name: "Supplier LLC",
			},
			wantErr: false,
		},
		{
			name:    "name required",
			input:   domain.Counterparty{RegistrationNumber: "1", LegalAddress: "addr"},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := domain.ValidateCounterparty(tt.input)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
