package config

import (
	"testing"
)

// TestValidateProduction ensures dev secrets are rejected in production environments.
func TestValidateProduction(t *testing.T) {
	tests := []struct {
		name        string
		environment string
		jwtSecret   string
		hubSecret   string
		expectError bool
		desc        string
	}{
		{
			name:        "dev_environment_allows_dev_secrets",
			environment: "development",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: false,
			desc:        "Development environment should allow dev secrets",
		},
		{
			name:        "local_environment_allows_dev_secrets",
			environment: "local",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: false,
			desc:        "Local environment should allow dev secrets",
		},
		{
			name:        "test_environment_allows_dev_secrets",
			environment: "test",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: false,
			desc:        "Test environment should allow dev secrets",
		},
		{
			name:        "ci_environment_allows_dev_secrets",
			environment: "ci",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: false,
			desc:        "CI environment should allow dev secrets",
		},
		{
			name:        "production_rejects_dev_jwt_secret",
			environment: "production",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "prod-hub-secret-xxx",
			expectError: true,
			desc:        "Production must reject dev JWT secret",
		},
		{
			name:        "production_rejects_dev_hub_secret",
			environment: "production",
			jwtSecret:   "prod-jwt-secret-xxx",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: true,
			desc:        "Production must reject dev HUB secret",
		},
		{
			name:        "production_rejects_empty_jwt_secret",
			environment: "production",
			jwtSecret:   "",
			hubSecret:   "prod-hub-secret-xxx",
			expectError: true,
			desc:        "Production must reject empty JWT secret",
		},
		{
			name:        "production_rejects_empty_hub_secret",
			environment: "production",
			jwtSecret:   "prod-jwt-secret-xxx",
			hubSecret:   "",
			expectError: true,
			desc:        "Production must reject empty HUB secret",
		},
		{
			name:        "staging_rejects_dev_secrets",
			environment: "staging",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: true,
			desc:        "Staging must reject dev secrets",
		},
		{
			name:        "alpha_rejects_dev_secrets",
			environment: "alpha",
			jwtSecret:   "vdp-core-dev-secret",
			hubSecret:   "vdp-s2s-dev-secret",
			expectError: true,
			desc:        "Alpha must reject dev secrets",
		},
		{
			name:        "production_accepts_prod_secrets",
			environment: "production",
			jwtSecret:   "prod-jwt-secret-at-least-32-chars-long!!",
			hubSecret:   "prod-hub-shared-secret-at-least-32-chars",
			expectError: false,
			desc:        "Production should accept proper production secrets",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{
				Environment:     tt.environment,
				JWTSecret:       tt.jwtSecret,
				HubSharedSecret: tt.hubSecret,
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
