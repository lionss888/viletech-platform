package domain

import (
	"time"
)

// Config represents application configuration
type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Redis    RedisConfig    `yaml:"redis"`
	JWT      JWTConfig      `yaml:"jwt"`
	Logging  LoggingConfig  `yaml:"logging"`
	Metrics  MetricsConfig  `yaml:"metrics"`
}

// ServerConfig represents server configuration
type ServerConfig struct {
	Port            string        `yaml:"port" env:"SERVER_PORT" env-default:"8080"`
	Host            string        `yaml:"host" env:"SERVER_HOST" env-default:"0.0.0.0"`
	ReadTimeout     time.Duration `yaml:"read_timeout" env:"SERVER_READ_TIMEOUT" env-default:"30s"`
	WriteTimeout    time.Duration `yaml:"write_timeout" env:"SERVER_WRITE_TIMEOUT" env-default:"30s"`
	ShutdownTimeout time.Duration `yaml:"shutdown_timeout" env:"SERVER_SHUTDOWN_TIMEOUT" env-default:"10s"`
	Environment     string        `yaml:"environment" env:"ENVIRONMENT" env-default:"development"`
}

// DatabaseConfig represents database configuration
type DatabaseConfig struct {
	Host         string `yaml:"host" env:"DB_HOST" env-default:"localhost"`
	Port         int    `yaml:"port" env:"DB_PORT" env-default:"5432"`
	User         string `yaml:"user" env:"DB_USER" env-default:"postgres"`
	Password     string `yaml:"password" env:"DB_PASSWORD" env-default:""`
	Database     string `yaml:"database" env:"DB_NAME" env-default:"amg_integration_bus"`
	SSLMode      string `yaml:"ssl_mode" env:"DB_SSL_MODE" env-default:"disable"`
	MaxOpenConns int    `yaml:"max_open_conns" env:"DB_MAX_OPEN_CONNS" env-default:"25"`
	MaxIdleConns int    `yaml:"max_idle_conns" env:"DB_MAX_IDLE_CONNS" env-default:"5"`
	MaxLifetime  time.Duration `yaml:"max_lifetime" env:"DB_MAX_LIFETIME" env-default:"5m"`
}

// RedisConfig represents Redis configuration
type RedisConfig struct {
	Host     string `yaml:"host" env:"REDIS_HOST" env-default:"localhost"`
	Port     int    `yaml:"port" env:"REDIS_PORT" env-default:"6379"`
	Password string `yaml:"password" env:"REDIS_PASSWORD" env-default:""`
	Database int    `yaml:"database" env:"REDIS_DB" env-default:"0"`
	PoolSize int    `yaml:"pool_size" env:"REDIS_POOL_SIZE" env-default:"10"`
}

// JWTConfig represents JWT configuration
type JWTConfig struct {
	Secret         string        `yaml:"secret" env:"JWT_SECRET" env-default:"your-secret-key"`
	ExpirationTime time.Duration `yaml:"expiration_time" env:"JWT_EXPIRATION" env-default:"24h"`
	RefreshTime    time.Duration `yaml:"refresh_time" env:"JWT_REFRESH_TIME" env-default:"168h"`
}

// LoggingConfig represents logging configuration
type LoggingConfig struct {
	Level  string `yaml:"level" env:"LOG_LEVEL" env-default:"info"`
	Format string `yaml:"format" env:"LOG_FORMAT" env-default:"json"`
	Output string `yaml:"output" env:"LOG_OUTPUT" env-default:"stdout"`
}

// MetricsConfig represents metrics configuration
type MetricsConfig struct {
	Enabled      bool   `yaml:"enabled" env:"METRICS_ENABLED" env-default:"true"`
	Port         string `yaml:"port" env:"METRICS_PORT" env-default:"9090"`
	Path         string `yaml:"path" env:"METRICS_PATH" env-default:"/metrics"`
	CollectInterval time.Duration `yaml:"collect_interval" env:"METRICS_COLLECT_INTERVAL" env-default:"15s"`
}

// User represents a user in the system
type User struct {
	ID        string    `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Username  string    `json:"username" db:"username"`
	FirstName string    `json:"first_name" db:"first_name"`
	LastName  string    `json:"last_name" db:"last_name"`
	Role      string    `json:"role" db:"role"`
	Active    bool      `json:"active" db:"active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// AuthRequest represents authentication request
type AuthRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	User         *User  `json:"user"`
	ExpiresAt    int64  `json:"expires_at"`
}

// APIResponse represents standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// APIError represents API error
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Meta represents response metadata
type Meta struct {
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"per_page,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}
