package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port            string
	Host            string
	LogLevel        string
	Environment     string
	DatabaseURL     string
	StoreDriver     string
	SharedSecret    string
	CoreURL         string
	ExternalTimeout int
	MaxRetries      int
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8081"),
		Host:            getEnv("HOST", "0.0.0.0"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://vdp_hub:vdp_hub@localhost:5432/vdp_hub?sslmode=disable"),
		StoreDriver:     getEnv("STORE_DRIVER", "postgres"),
		SharedSecret:    getEnv("HUB_SHARED_SECRET", "vdp-s2s-dev-secret"),
		CoreURL:         getEnv("CORE_URL", "http://localhost:8080"),
		ExternalTimeout: getEnvAsInt("EXTERNAL_TIMEOUT_MS", 3000),
		MaxRetries:      getEnvAsInt("EXTERNAL_MAX_RETRIES", 3),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// isLocalEnvironment allows well-known dev secrets only for local/CI environments.
func isLocalEnvironment(env string) bool {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "", "development", "dev", "local", "test", "ci":
		return true
	}
	return false
}

// ValidateProduction rejects well-known dev S2S secret on any non-local ENVIRONMENT
// (production, staging, alpha, beta, gamma, etc.).
func (c *Config) ValidateProduction() error {
	if isLocalEnvironment(c.Environment) {
		return nil
	}
	if c.SharedSecret == "" || c.SharedSecret == "vdp-s2s-dev-secret" {
		return fmt.Errorf("%s: set non-default HUB_SHARED_SECRET", c.Environment)
	}
	return nil
}
