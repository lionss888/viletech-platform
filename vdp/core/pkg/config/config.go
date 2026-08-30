package config

import (
	"fmt"
	"os"
	"strconv"
)

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
}

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

// ValidateProduction rejects well-known dev secrets when ENVIRONMENT is production/prod.
func (c *Config) ValidateProduction() error {
	env := c.Environment
	if env != "production" && env != "prod" {
		return nil
	}
	checks := map[string]string{
		"JWT_SECRET":        "vdp-core-dev-secret",
		"HUB_SHARED_SECRET": "vdp-s2s-dev-secret",
	}
	for key, forbidden := range checks {
		val := os.Getenv(key)
		if val == "" {
			if key == "JWT_SECRET" {
				val = c.JWTSecret
			} else {
				val = c.HubSharedSecret
			}
		}
		if val == forbidden {
			return fmt.Errorf("production: set non-default %s", key)
		}
	}
	return nil
}
