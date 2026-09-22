package config

import (
	"testing"
)

// TestValidateProduction ensures dev S2S secret is rejected in production environments.
func TestValidateProduction(t *testing.T) {
	tests := []struct {
		name         string
		environment  string
		sharedSecret string
		expectError  bool
		desc         string
	}{
		{
			name:         "dev_environment_allows_dev_secret",
			environment:  "development",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  false,
			desc:         "Development environment should allow dev secret",
		},
		{
			name:         "local_environment_allows_dev_secret",
			environment:  "local",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  false,
			desc:         "Local environment should allow dev secret",
		},
		{
			name:         "test_environment_allows_dev_secret",
			environment:  "test",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  false,
			desc:         "Test environment should allow dev secret",
		},
		{
			name:         "ci_environment_allows_dev_secret",
			environment:  "ci",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  false,
			desc:         "CI environment should allow dev secret",
		},
		{
			name:         "production_rejects_dev_secret",
			environment:  "production",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  true,
			desc:         "Production must reject dev S2S secret",
		},
		{
			name:         "production_rejects_empty_secret",
			environment:  "production",
			sharedSecret: "",
			expectError:  true,
			desc:         "Production must reject empty S2S secret",
		},
		{
			name:         "staging_rejects_dev_secret",
			environment:  "staging",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  true,
			desc:         "Staging must reject dev secret",
		},
		{
			name:         "alpha_rejects_dev_secret",
			environment:  "alpha",
			sharedSecret: "vdp-s2s-dev-secret",
			expectError:  true,
			desc:         "Alpha must reject dev secret",
		},
		{
			name:         "production_accepts_prod_secret",
			environment:  "production",
			sharedSecret: "prod-hub-shared-secret-at-least-32-chars",
			expectError:  false,
			desc:         "Production should accept proper production secret",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{
				Environment:  tt.environment,
				SharedSecret: tt.sharedSecret,
			}

			err := cfg.ValidateProduction()

			if tt.expectError && err == nil {
				t.Errorf("%s: expected error but got none\nDesc: %s", tt.name, tt.desc)
			}
			if !tt.expectError && err != nil {
				t.Errorf("%s: unexpected error: %v\nDesc: %s", tt.name, err, tt.desc)
			}
		})
	}
}

// TestOCRTimeoutDefaultIsIndependentOfExternalTimeout keeps OCR slow-path budget at 120s.
func TestOCRTimeoutDefaultIsIndependentOfExternalTimeout(t *testing.T) {
	t.Setenv("EXTERNAL_TIMEOUT_MS", "3000")
	t.Setenv("OCR_TIMEOUT_MS", "")
	cfg := Load()
	if cfg.ExternalTimeout != 3000 {
		t.Fatalf("ExternalTimeout=%d", cfg.ExternalTimeout)
	}
	if cfg.OCRTimeout != 120000 {
		t.Fatalf("OCRTimeout default want 120000 got %d", cfg.OCRTimeout)
	}
	t.Setenv("OCR_TIMEOUT_MS", "90000")
	cfg2 := Load()
	if cfg2.OCRTimeout != 90000 {
		t.Fatalf("OCRTimeout override want 90000 got %d", cfg2.OCRTimeout)
	}
}

// TestIsLocalEnvironment verifies environment classification.
func TestIsLocalEnvironment(t *testing.T) {
	localEnvs := []string{"", "development", "dev", "DEV", "local", "LOCAL", "test", "TEST", "ci", "CI"}
	prodEnvs := []string{"production", "PRODUCTION", "staging", "alpha", "beta", "gamma", "prod"}

	for _, env := range localEnvs {
		if !isLocalEnvironment(env) {
			t.Errorf("isLocalEnvironment(%q) should be true", env)
		}
	}

	for _, env := range prodEnvs {
		if isLocalEnvironment(env) {
			t.Errorf("isLocalEnvironment(%q) should be false", env)
		}
	}
}
