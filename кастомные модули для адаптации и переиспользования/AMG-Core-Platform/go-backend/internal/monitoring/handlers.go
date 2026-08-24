package monitoring

import (
	"net/http"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// MonitoringHandlers handles monitoring HTTP requests
type MonitoringHandlers struct {
	service MonitoringService
	logger  logger.Logger
}

// NewMonitoringHandlers creates new monitoring handlers
func NewMonitoringHandlers(service MonitoringService, logger logger.Logger) *MonitoringHandlers {
	return &MonitoringHandlers{
		service: service,
		logger:  logger,
	}
}

// GetMetrics returns all metrics
func (h *MonitoringHandlers) GetMetrics(c *gin.Context) {
	h.logger.Info("Getting metrics")

	metrics := h.service.GetMetrics()

	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
		"count":   len(metrics),
	})
}

// GetHealth returns health status
func (h *MonitoringHandlers) GetHealth(c *gin.Context) {
	h.logger.Info("Getting health status")

	health := h.service.GetHealth()

	statusCode := http.StatusOK
	if health.Status == HealthStatusUnhealthy {
		statusCode = http.StatusServiceUnavailable
	} else if health.Status == HealthStatusDegraded {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, health)
}

// GetAlerts returns all alerts
func (h *MonitoringHandlers) GetAlerts(c *gin.Context) {
	h.logger.Info("Getting alerts")

	alerts := h.service.GetAlerts()

	c.JSON(http.StatusOK, gin.H{
		"alerts": alerts,
		"count":  len(alerts),
	})
}

// ResolveAlert resolves an alert
func (h *MonitoringHandlers) ResolveAlert(c *gin.Context) {
	alertID := c.Param("id")
	h.logger.Infof("Resolving alert: %s", alertID)

	if err := h.service.ResolveAlert(alertID); err != nil {
		h.logger.Errorf("Failed to resolve alert: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Alert not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Alert resolved successfully",
	})
}

// GetMetricsByType returns metrics by type
func (h *MonitoringHandlers) GetMetricsByType(c *gin.Context) {
	metricType := c.Param("type")
	h.logger.Infof("Getting metrics by type: %s", metricType)

	metrics := h.service.GetMetrics()
	filteredMetrics := make([]Metric, 0)

	for _, metric := range metrics {
		if string(metric.Type) == metricType {
			filteredMetrics = append(filteredMetrics, metric)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": filteredMetrics,
		"count":   len(filteredMetrics),
		"type":    metricType,
	})
}

// GetMetricsByName returns metrics by name
func (h *MonitoringHandlers) GetMetricsByName(c *gin.Context) {
	metricName := c.Param("name")
	h.logger.Infof("Getting metrics by name: %s", metricName)

	metrics := h.service.GetMetrics()
	filteredMetrics := make([]Metric, 0)

	for _, metric := range metrics {
		if metric.Name == metricName {
			filteredMetrics = append(filteredMetrics, metric)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": filteredMetrics,
		"count":   len(filteredMetrics),
		"name":    metricName,
	})
}

// RecordMetric records a new metric
func (h *MonitoringHandlers) RecordMetric(c *gin.Context) {
	var metric Metric
	if err := c.ShouldBindJSON(&metric); err != nil {
		h.logger.Errorf("Failed to bind metric: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid metric data",
		})
		return
	}

	h.logger.Infof("Recording metric: %s", metric.Name)

	h.service.RecordMetric(metric)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Metric recorded successfully",
		"metric":  metric,
	})
}

// GetHealthCheck returns a specific health check
func (h *MonitoringHandlers) GetHealthCheck(c *gin.Context) {
	checkName := c.Param("name")
	h.logger.Infof("Getting health check: %s", checkName)

	health := h.service.GetHealth()

	var check *HealthCheck
	for _, hc := range health.Checks {
		if hc.Name == checkName {
			check = &hc
			break
		}
	}

	if check == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Health check not found",
		})
		return
	}

	c.JSON(http.StatusOK, check)
}

// GetDashboard returns monitoring dashboard data
func (h *MonitoringHandlers) GetDashboard(c *gin.Context) {
	h.logger.Info("Getting dashboard data")

	health := h.service.GetHealth()
	metrics := h.service.GetMetrics()
	alerts := h.service.GetAlerts()

	dashboard := gin.H{
		"health": health,
		"metrics": gin.H{
			"total":      len(metrics),
			"counters":   len(filterMetricsByType(metrics, MetricTypeCounter)),
			"gauges":     len(filterMetricsByType(metrics, MetricTypeGauge)),
			"histograms": len(filterMetricsByType(metrics, MetricTypeHistogram)),
			"summaries":  len(filterMetricsByType(metrics, MetricTypeSummary)),
		},
		"alerts": gin.H{
			"total":    len(alerts),
			"firing":   len(filterAlertsByStatus(alerts, "firing")),
			"resolved": len(filterAlertsByStatus(alerts, "resolved")),
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, dashboard)
}

// filterMetricsByType filters metrics by type
func filterMetricsByType(metrics []Metric, metricType MetricType) []Metric {
	filtered := make([]Metric, 0)
	for _, metric := range metrics {
		if metric.Type == metricType {
			filtered = append(filtered, metric)
		}
	}
	return filtered
}

// filterAlertsByStatus filters alerts by status
func filterAlertsByStatus(alerts []Alert, status string) []Alert {
	filtered := make([]Alert, 0)
	for _, alert := range alerts {
		if alert.Status == status {
			filtered = append(filtered, alert)
		}
	}
	return filtered
}
