package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"amg-flow-backend/internal/monitoring"
	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize logger
	logger := logger.New("info")

	// Create monitoring configuration
	config := &monitoring.MonitoringConfig{
		Enabled:           true,
		MetricsPort:       9090,
		HealthPort:        8081,
		JaegerEndpoint:    getEnv("JAEGER_ENDPOINT", "http://localhost:14268/api/traces"),
		JaegerServiceName: "amg-core-monitoring",
		PrometheusEnabled: true,
		LogLevel:          "info",
	}

	// Create monitoring service
	monitoringService := monitoring.NewMonitoringService(config, logger)

	// Start monitoring service
	ctx := context.Background()
	if err := monitoringService.Start(ctx); err != nil {
		logger.Fatalf("Failed to start monitoring service: %v", err)
	}

	// Create HTTP server for monitoring endpoints
	router := gin.Default()

	// Create monitoring handlers
	handlers := monitoring.NewMonitoringHandlers(monitoringService, logger)

	// Register routes
	router.GET("/metrics", handlers.GetMetrics)
	router.GET("/health", handlers.GetHealth)
	router.GET("/alerts", handlers.GetAlerts)
	router.POST("/alerts/:id/resolve", handlers.ResolveAlert)
	router.GET("/metrics/type/:type", handlers.GetMetricsByType)
	router.GET("/metrics/name/:name", handlers.GetMetricsByName)
	router.POST("/metrics", handlers.RecordMetric)
	router.GET("/health/:name", handlers.GetHealthCheck)
	router.GET("/dashboard", handlers.GetDashboard)

	// Start HTTP server
	go func() {
		logger.Infof("Starting monitoring server on port %d", config.HealthPort)
		if err := router.Run(":8081"); err != nil {
			logger.Fatalf("Failed to start monitoring server: %v", err)
		}
	}()

	// Simulate some metrics
	go func() {
		time.Sleep(5 * time.Second)
		simulateMetrics(monitoringService, logger)
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down monitoring service...")

	// Stop monitoring service
	if err := monitoringService.Stop(); err != nil {
		logger.Errorf("Failed to stop monitoring service: %v", err)
	}

	logger.Info("Monitoring service stopped")
}

func simulateMetrics(service monitoring.MonitoringService, logger logger.Logger) {
	logger.Info("Simulating metrics...")

	// Simulate counter metrics
	service.RecordMetric(monitoring.Metric{
		Name:        "http_requests_total",
		Type:        monitoring.MetricTypeCounter,
		Value:       1,
		Labels:      map[string]string{"method": "GET", "endpoint": "/api/users"},
		Timestamp:   time.Now(),
		Description: "Total HTTP requests",
	})

	service.RecordMetric(monitoring.Metric{
		Name:        "http_requests_total",
		Type:        monitoring.MetricTypeCounter,
		Value:       1,
		Labels:      map[string]string{"method": "POST", "endpoint": "/api/payments"},
		Timestamp:   time.Now(),
		Description: "Total HTTP requests",
	})

	// Simulate gauge metrics
	service.RecordMetric(monitoring.Metric{
		Name:        "active_connections",
		Type:        monitoring.MetricTypeGauge,
		Value:       150,
		Labels:      map[string]string{"service": "api"},
		Timestamp:   time.Now(),
		Description: "Active connections",
	})

	service.RecordMetric(monitoring.Metric{
		Name:        "memory_usage_bytes",
		Type:        monitoring.MetricTypeGauge,
		Value:       1024 * 1024 * 512, // 512MB
		Labels:      map[string]string{"service": "api"},
		Timestamp:   time.Now(),
		Description: "Memory usage in bytes",
	})

	// Simulate histogram metrics
	service.RecordMetric(monitoring.Metric{
		Name:        "http_request_duration_seconds",
		Type:        monitoring.MetricTypeHistogram,
		Value:       0.1,
		Labels:      map[string]string{"method": "GET", "endpoint": "/api/users"},
		Timestamp:   time.Now(),
		Description: "HTTP request duration",
	})

	service.RecordMetric(monitoring.Metric{
		Name:        "http_request_duration_seconds",
		Type:        monitoring.MetricTypeHistogram,
		Value:       0.5,
		Labels:      map[string]string{"method": "POST", "endpoint": "/api/payments"},
		Timestamp:   time.Now(),
		Description: "HTTP request duration",
	})

	// Simulate summary metrics
	service.RecordMetric(monitoring.Metric{
		Name:        "grpc_request_duration_seconds",
		Type:        monitoring.MetricTypeSummary,
		Value:       0.05,
		Labels:      map[string]string{"service": "UserService", "method": "CreateUser"},
		Timestamp:   time.Now(),
		Description: "gRPC request duration",
	})

	logger.Info("Metrics simulation completed")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
