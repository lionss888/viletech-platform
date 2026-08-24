package monitoring

import (
	"context"
	"time"
)

// MetricType represents the type of metric
type MetricType string

const (
	MetricTypeCounter   MetricType = "counter"
	MetricTypeGauge     MetricType = "gauge"
	MetricTypeHistogram MetricType = "histogram"
	MetricTypeSummary   MetricType = "summary"
)

// Metric represents a monitoring metric
type Metric struct {
	Name        string            `json:"name"`
	Type        MetricType        `json:"type"`
	Value       float64           `json:"value"`
	Labels      map[string]string `json:"labels"`
	Timestamp   time.Time         `json:"timestamp"`
	Description string            `json:"description"`
}

// HealthStatus represents the health status of a service
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
	HealthStatusDegraded  HealthStatus = "degraded"
	HealthStatusUnknown   HealthStatus = "unknown"
)

// HealthCheck represents a health check
type HealthCheck struct {
	Name      string                 `json:"name"`
	Status    HealthStatus           `json:"status"`
	Message   string                 `json:"message"`
	Timestamp time.Time              `json:"timestamp"`
	Duration  time.Duration          `json:"duration"`
	Details   map[string]interface{} `json:"details"`
}

// ServiceHealth represents the overall health of a service
type ServiceHealth struct {
	ServiceName string        `json:"service_name"`
	Status      HealthStatus  `json:"status"`
	Timestamp   time.Time     `json:"timestamp"`
	Uptime      time.Duration `json:"uptime"`
	Version     string        `json:"version"`
	Checks      []HealthCheck `json:"checks"`
}

// MonitoringConfig represents configuration for monitoring
type MonitoringConfig struct {
	Enabled           bool   `json:"enabled"`
	MetricsPort       int    `json:"metrics_port"`
	HealthPort        int    `json:"health_port"`
	JaegerEndpoint    string `json:"jaeger_endpoint"`
	JaegerServiceName string `json:"jaeger_service_name"`
	PrometheusEnabled bool   `json:"prometheus_enabled"`
	LogLevel          string `json:"log_level"`
}

// MetricsCollector defines the interface for collecting metrics
type MetricsCollector interface {
	IncrementCounter(name string, labels map[string]string)
	SetGauge(name string, value float64, labels map[string]string)
	ObserveHistogram(name string, value float64, labels map[string]string)
	ObserveSummary(name string, value float64, labels map[string]string)
	GetMetrics() []Metric
}

// HealthChecker defines the interface for health checks
type HealthChecker interface {
	CheckHealth(ctx context.Context) *ServiceHealth
	RegisterCheck(name string, check HealthCheckFunc)
	GetHealth() *ServiceHealth
	DatabaseHealthCheck(db interface{}) HealthCheckFunc
	EventBusHealthCheck(eventBus interface{}) HealthCheckFunc
	GRPCHealthCheck(grpcServer interface{}) HealthCheckFunc
	MemoryHealthCheck() HealthCheckFunc
	DiskHealthCheck() HealthCheckFunc
	NetworkHealthCheck() HealthCheckFunc
}

// HealthCheckFunc defines a function for health checks
type HealthCheckFunc func(ctx context.Context) HealthCheck

// MonitoringService defines the interface for monitoring operations
type MonitoringService interface {
	Start(ctx context.Context) error
	Stop() error
	GetMetrics() []Metric
	GetHealth() *ServiceHealth
	RecordMetric(metric Metric)
	RecordHealthCheck(check HealthCheck)
	GetAlerts() []Alert
	ResolveAlert(alertID string) error
}

// Alert represents an alert
type Alert struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Severity    string            `json:"severity"`
	Message     string            `json:"message"`
	Timestamp   time.Time         `json:"timestamp"`
	Labels      map[string]string `json:"labels"`
	Annotations map[string]string `json:"annotations"`
	Status      string            `json:"status"`
}

// AlertManager defines the interface for managing alerts
type AlertManager interface {
	SendAlert(alert Alert) error
	GetAlerts() []Alert
	ResolveAlert(alertID string) error
}

// Dashboard represents a monitoring dashboard
type Dashboard struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Panels      []DashboardPanel  `json:"panels"`
	Variables   map[string]string `json:"variables"`
	Refresh     string            `json:"refresh"`
}

// DashboardPanel represents a panel in a dashboard
type DashboardPanel struct {
	ID       string                 `json:"id"`
	Title    string                 `json:"title"`
	Type     string                 `json:"type"`
	Query    string                 `json:"query"`
	Options  map[string]interface{} `json:"options"`
	Position map[string]int         `json:"position"`
	Size     map[string]int         `json:"size"`
}
