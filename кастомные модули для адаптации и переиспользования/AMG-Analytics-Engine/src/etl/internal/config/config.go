package config

import (
	"fmt"
	"os"
)

type Config struct {
	Postgres struct {
		Host     string
		Port     string
		Database string
		User     string
		Password string
		SSLMode  string
	}
	ClickHouse struct {
		Host     string
		Port     string
		Database string
		User     string
		Password string
	}
	Schedule struct {
		Hourly  bool
		Daily   bool
		Weekly  bool
	}
}

func Load() *Config {
	cfg := &Config{}

	// PostgreSQL конфигурация
	cfg.Postgres.Host = getEnv("POSTGRES_HOST", "localhost")
	cfg.Postgres.Port = getEnv("POSTGRES_PORT", "5432")
	cfg.Postgres.Database = getEnv("POSTGRES_DB", "abs_core")
	cfg.Postgres.User = getEnv("POSTGRES_USER", "lionss")
	cfg.Postgres.Password = getEnv("POSTGRES_PASSWORD", "Lionss2025")
	cfg.Postgres.SSLMode = getEnv("POSTGRES_SSLMODE", "disable")

	// ClickHouse конфигурация
	cfg.ClickHouse.Host = getEnv("CLICKHOUSE_HOST", "localhost")
	cfg.ClickHouse.Port = getEnv("CLICKHOUSE_PORT", "9000")
	cfg.ClickHouse.Database = getEnv("CLICKHOUSE_DB", "abs_analytics")
	cfg.ClickHouse.User = getEnv("CLICKHOUSE_USER", "default")
	cfg.ClickHouse.Password = getEnv("CLICKHOUSE_PASSWORD", "")

	// Расписание
	cfg.Schedule.Hourly = getEnvBool("ETL_HOURLY", true)
	cfg.Schedule.Daily = getEnvBool("ETL_DAILY", true)
	cfg.Schedule.Weekly = getEnvBool("ETL_WEEKLY", false)

	return cfg
}

func (c *Config) GetPostgresDSN() string {
	return fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s sslmode=%s",
		c.Postgres.Host, c.Postgres.Port, c.Postgres.Database,
		c.Postgres.User, c.Postgres.Password, c.Postgres.SSLMode)
}

func (c *Config) GetClickHouseDSN() string {
	return fmt.Sprintf("clickhouse://%s:%s@%s:%s/%s?dial_timeout=10s&max_execution_time=60",
		c.ClickHouse.User, c.ClickHouse.Password,
		c.ClickHouse.Host, c.ClickHouse.Port, c.ClickHouse.Database)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1"
	}
	return defaultValue
}
