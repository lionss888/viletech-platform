package monitoring

import (
	"sync"
	"time"

	"amg-flow-backend/pkg/logger"
)

// PrometheusCollector implements MetricsCollector using Prometheus
type PrometheusCollector struct {
	metrics map[string]Metric
	mu      sync.RWMutex
	logger  logger.Logger
}

// NewPrometheusCollector creates a new Prometheus metrics collector
func NewPrometheusCollector(logger logger.Logger) *PrometheusCollector {
	return &PrometheusCollector{
		metrics: make(map[string]Metric),
		logger:  logger,
	}
}

// IncrementCounter increments a counter metric
func (c *PrometheusCollector) IncrementCounter(name string, labels map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(name, labels)
	if metric, exists := c.metrics[key]; exists {
		metric.Value++
		metric.Timestamp = time.Now()
		c.metrics[key] = metric
	} else {
		c.metrics[key] = Metric{
			Name:        name,
			Type:        MetricTypeCounter,
			Value:       1,
			Labels:      labels,
			Timestamp:   time.Now(),
			Description: "Counter metric",
		}
	}

	c.logger.Debugf("Incremented counter: %s", name)
}

// SetGauge sets a gauge metric
func (c *PrometheusCollector) SetGauge(name string, value float64, labels map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(name, labels)
	c.metrics[key] = Metric{
		Name:        name,
		Type:        MetricTypeGauge,
		Value:       value,
		Labels:      labels,
		Timestamp:   time.Now(),
		Description: "Gauge metric",
	}

	c.logger.Debugf("Set gauge: %s = %f", name, value)
}

// ObserveHistogram observes a histogram metric
func (c *PrometheusCollector) ObserveHistogram(name string, value float64, labels map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(name, labels)
	if metric, exists := c.metrics[key]; exists {
		metric.Value = (metric.Value + value) / 2 // Simple average
		metric.Timestamp = time.Now()
		c.metrics[key] = metric
	} else {
		c.metrics[key] = Metric{
			Name:        name,
			Type:        MetricTypeHistogram,
			Value:       value,
			Labels:      labels,
			Timestamp:   time.Now(),
			Description: "Histogram metric",
		}
	}

	c.logger.Debugf("Observed histogram: %s = %f", name, value)
}

// ObserveSummary observes a summary metric
func (c *PrometheusCollector) ObserveSummary(name string, value float64, labels map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(name, labels)
	if metric, exists := c.metrics[key]; exists {
		metric.Value = (metric.Value + value) / 2 // Simple average
		metric.Timestamp = time.Now()
		c.metrics[key] = metric
	} else {
		c.metrics[key] = Metric{
			Name:        name,
			Type:        MetricTypeSummary,
			Value:       value,
			Labels:      labels,
			Timestamp:   time.Now(),
			Description: "Summary metric",
		}
	}

	c.logger.Debugf("Observed summary: %s = %f", name, value)
}

// GetMetrics returns all collected metrics
func (c *PrometheusCollector) GetMetrics() []Metric {
	c.mu.RLock()
	defer c.mu.RUnlock()

	metrics := make([]Metric, 0, len(c.metrics))
	for _, metric := range c.metrics {
		metrics = append(metrics, metric)
	}

	return metrics
}

// generateKey generates a unique key for a metric
func (c *PrometheusCollector) generateKey(name string, labels map[string]string) string {
	key := name
	for k, v := range labels {
		key += ":" + k + "=" + v
	}
	return key
}

// ClearMetrics clears all metrics
func (c *PrometheusCollector) ClearMetrics() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.metrics = make(map[string]Metric)
	c.logger.Info("Metrics cleared")
}

// GetMetricByName returns metrics by name
func (c *PrometheusCollector) GetMetricByName(name string) []Metric {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var metrics []Metric
	for _, metric := range c.metrics {
		if metric.Name == name {
			metrics = append(metrics, metric)
		}
	}

	return metrics
}

// GetMetricsByType returns metrics by type
func (c *PrometheusCollector) GetMetricsByType(metricType MetricType) []Metric {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var metrics []Metric
	for _, metric := range c.metrics {
		if metric.Type == metricType {
			metrics = append(metrics, metric)
		}
	}

	return metrics
}
