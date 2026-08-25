package config

import (
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
