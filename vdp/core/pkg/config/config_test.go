package config_test

import (
	"testing"

	"github.com/viletech/vdp/core/pkg/config"
)

func TestValidateProductionRejectsDevSecrets(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Environment: "production", JWTSecret: "vdp-core-dev-secret", HubSharedSecret: "vdp-s2s-dev-secret"}
	if err := cfg.ValidateProduction(); err == nil {
		t.Fatal("expected error for dev secrets in production")
	}
	cfg.JWTSecret = "rotated-core-secret"
	cfg.HubSharedSecret = "rotated-s2s-secret"
	if err := cfg.ValidateProduction(); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestValidateProductionSkipsDevelopment(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Environment: "development", JWTSecret: "vdp-core-dev-secret"}
	if err := cfg.ValidateProduction(); err != nil {
		t.Fatalf("dev env should skip: %v", err)
	}
}
