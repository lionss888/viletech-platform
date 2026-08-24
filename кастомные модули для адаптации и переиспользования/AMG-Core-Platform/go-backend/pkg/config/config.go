package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config содержит конфигурацию приложения
type Config struct {
	// Server
	Port     string
	Host     string
	LogLevel string

	// Database
	DatabaseURL string
	DBHost      string
	DBPort      int
	DBUser      string
	DBPassword  string
	DBName      string
	DBSSLMode   string

	// Python Analytics Service
	PythonAnalyticsURL string

	// CORS
	CORSOrigins []string

	// Environment
	Environment string
	
	// API Gateway
	GatewayTimeout     int
	GatewayRateLimit   int
	
	// Security
	JWTSecret          string
	JWTExpirationHours int
	
	// Striga API
	StrigaAPIURL       string
	StrigaAPIKey       string
	StrigaAPISecret    string
	StrigaWebhookSecret string
}

// Load загружает конфигурацию из переменных окружения
func Load() (*Config, error) {
	// Загружаем .env файл если существует
	_ = godotenv.Load()

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		Host:        getEnv("HOST", "0.0.0.0"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnvAsInt("DB_PORT", 5432),
		DBUser:      getEnv("DB_USER", "user"),
		DBPassword:  getEnv("DB_PASSWORD", "password"),
		DBName:      getEnv("DB_NAME", "appdb"),
		DBSSLMode:   getEnv("DB_SSL_MODE", "require"),
		PythonAnalyticsURL: getEnv("PYTHON_ANALYTICS_URL", "http://localhost:8000"),
		CORSOrigins:        getEnvAsSlice("CORS_ORIGINS", []string{"http://localhost:3000", "http://localhost:5173"}),
		Environment:        getEnv("ENVIRONMENT", "development"),
		GatewayTimeout:     getEnvAsInt("GATEWAY_TIMEOUT", 30),
		GatewayRateLimit:   getEnvAsInt("GATEWAY_RATE_LIMIT", 100),
		JWTSecret:          getEnv("JWT_SECRET", "your-secret-key"),
		JWTExpirationHours: getEnvAsInt("JWT_EXPIRATION_HOURS", 24),
		StrigaAPIURL:       getEnv("STRIGA_API_URL", "https://api-sandbox.striga.com"),
		StrigaAPIKey:       getEnv("STRIGA_API_KEY", ""),
		StrigaAPISecret:    getEnv("STRIGA_API_SECRET", ""),
		StrigaWebhookSecret: getEnv("STRIGA_WEBHOOK_SECRET", ""),
	}

	return cfg, nil
}

// getEnv получает переменную окружения или возвращает значение по умолчанию
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt получает переменную окружения как int
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvAsSlice получает переменную окружения как slice строк
func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Простая реализация - в реальном проекте можно использовать более сложную логику
		return []string{value}
	}
	return defaultValue
}
