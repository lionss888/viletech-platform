package middleware

import (
	"strconv"
	"time"

	"amg-flow-backend/pkg/metrics"

	"github.com/gin-gonic/gin"
)

// MetricsMiddleware middleware для сбора метрик HTTP запросов
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		// Увеличиваем счетчик активных запросов
		if metrics.AppMetrics != nil {
			metrics.AppMetrics.HTTPRequestsInFlight.Inc()
		}

		// Обрабатываем запрос
		c.Next()

		// Уменьшаем счетчик активных запросов
		if metrics.AppMetrics != nil {
			metrics.AppMetrics.HTTPRequestsInFlight.Dec()
		}

		// Записываем метрики
		duration := time.Since(start)
		method := c.Request.Method
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = "unknown"
		}
		status := strconv.Itoa(c.Writer.Status())

		if metrics.AppMetrics != nil {
			metrics.AppMetrics.RecordHTTPRequest(method, endpoint, status, duration)
		}
	}
}

// PrometheusHandler возвращает handler для Prometheus метрик
func PrometheusHandler() gin.HandlerFunc {
	return gin.WrapH(promhttp.Handler())
}
