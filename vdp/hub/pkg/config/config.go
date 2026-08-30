package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port            string
	Host            string
	LogLevel        string
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

// ValidateProduction rejects well-known dev S2S secret in production.
func (c *Config) ValidateProduction() error {
	env := os.Getenv("ENVIRONMENT")
	if env != "production" && env != "prod" {
		return nil
	}
	if c.SharedSecret == "" || c.SharedSecret == "vdp-s2s-dev-secret" {
		return fmt.Errorf("production: set non-default HUB_SHARED_SECRET")
	}
	return nil
}
