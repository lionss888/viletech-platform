package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds runtime settings for core (DB, JWT, Hub, health probes, blobs).
type Config struct {
	Port               string
	Host               string
	LogLevel           string
	Environment        string
	DatabaseURL        string
	StoreDriver        string
	JWTSecret          string
	JWTExpirationHours int
	HubURL             string
	HubSharedSecret    string
	RateLimitPerMinute int
	GatewayTimeoutSec  int
	BlobDir            string
	ExtractionURL      string
	DocsHealthURL      string
	MailHealthURL      string
	SMSHealthURL       string
	ManagerOpsHealthURL string
	ManagerOpsURL       string
}

// Load reads environment variables with local-dev defaults.
func Load() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		Host:               getEnv("HOST", "0.0.0.0"),
		LogLevel:           getEnv("LOG_LEVEL", "info"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable"),
		StoreDriver:        getEnv("STORE_DRIVER", "postgres"),
		JWTSecret:          getEnv("JWT_SECRET", "vdp-core-dev-secret"),
		JWTExpirationHours: getEnvAsInt("JWT_EXPIRATION_HOURS", 24),
		HubURL:             getEnv("HUB_URL", "http://localhost:8081"),
		HubSharedSecret:    getEnv("HUB_SHARED_SECRET", "vdp-s2s-dev-secret"),
		RateLimitPerMinute: getEnvAsInt("GATEWAY_RATE_LIMIT", 120),
		GatewayTimeoutSec:  getEnvAsInt("GATEWAY_TIMEOUT", 15),
		BlobDir:            getEnv("VDP_BLOB_DIR", "data/blobs"),
		ExtractionURL:      getEnv("EXTRACTION_URL", "http://localhost:8093"),
		DocsHealthURL:      getEnv("DOCS_HEALTH_URL", "http://localhost:8090/health"),
		MailHealthURL:      getEnv("MAIL_HEALTH_URL", "http://localhost:8091/health"),
		SMSHealthURL:       getEnv("SMS_HEALTH_URL", "http://localhost:8092/health"),
		ManagerOpsHealthURL: getEnv("MANAGER_OPS_HEALTH_URL", ""),
		ManagerOpsURL:       getEnv("MANAGER_OPS_URL", ""),
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

// ValidateProduction rejects well-known dev secrets on any non-local ENVIRONMENT
// (production, staging, alpha, beta, gamma, etc.).
func (c *Config) ValidateProduction() error {
	if isLocalEnvironment(c.Environment) {
		return nil
	}
	if c.JWTSecret == "" || c.JWTSecret == "vdp-core-dev-secret" {
		return fmt.Errorf("%s: set non-default JWT_SECRET", c.Environment)
	}
	if c.HubSharedSecret == "" || c.HubSharedSecret == "vdp-s2s-dev-secret" {
		return fmt.Errorf("%s: set non-default HUB_SHARED_SECRET", c.Environment)
	}
	return nil
}
