package config_test

import (
	"testing"

	"github.com/viletech/vdp/hub/pkg/config"
)

func TestValidateProductionRejectsDevSecret(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Environment: "production", SharedSecret: "vdp-s2s-dev-secret"}
	if err := cfg.ValidateProduction(); err == nil {
		t.Fatal("expected error for dev S2S secret in production")
	}
	cfg.SharedSecret = "rotated-s2s-secret"
	if err := cfg.ValidateProduction(); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestValidateProductionSkipsDevelopment(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Environment: "development", SharedSecret: "vdp-s2s-dev-secret"}
	if err := cfg.ValidateProduction(); err != nil {
		t.Fatalf("dev env should skip: %v", err)
	}
}

func TestValidateProductionEnvironments(t *testing.T) {
	t.Parallel()
	localEnvs := []string{"", "development", "dev", "local", "test", "ci", "Development", " DEV "}
	for _, env := range localEnvs {
		env := env
		t.Run("local/"+env, func(t *testing.T) {
			t.Parallel()
			cfg := &config.Config{Environment: env, SharedSecret: "vdp-s2s-dev-secret"}
			if err := cfg.ValidateProduction(); err != nil {
				t.Fatalf("local env %q should allow dev secrets: %v", env, err)
			}
		})
	}
	networkEnvs := []string{"production", "prod", "staging", "alpha", "beta", "gamma", "STAGING"}
	for _, env := range networkEnvs {
		env := env
		t.Run("network/"+env, func(t *testing.T) {
			t.Parallel()
			cfg := &config.Config{Environment: env, SharedSecret: "vdp-s2s-dev-secret"}
			if err := cfg.ValidateProduction(); err == nil {
				t.Fatalf("network env %q must reject dev secrets", env)
			}
			cfg.SharedSecret = "rotated-s2s-secret"
			if err := cfg.ValidateProduction(); err != nil {
				t.Fatalf("network env %q should accept rotated secrets: %v", env, err)
			}
		})
	}
}
