package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics содержит все метрики приложения
type Metrics struct {
	// HTTP метрики
	HTTPRequestsTotal   *prometheus.CounterVec
	HTTPRequestDuration *prometheus.HistogramVec
	HTTPRequestsInFlight prometheus.Gauge

	// Чат метрики
	ChatRequestsTotal     *prometheus.CounterVec
	ChatRequestDuration   *prometheus.HistogramVec
	ChatTokensProcessed   *prometheus.CounterVec
	ActiveConversations   prometheus.Gauge
	MessagesSaved         *prometheus.CounterVec

	// UI метрики
	UIComponentsRequests *prometheus.CounterVec
	UISchemaRequests     *prometheus.CounterVec

	// База данных метрики
	DatabaseConnections    prometheus.Gauge
	DatabaseQueries        *prometheus.CounterVec
	DatabaseQueryDuration  *prometheus.HistogramVec
	DatabaseErrors         *prometheus.CounterVec

	// Python интеграция метрики
	PythonRequestsTotal    *prometheus.CounterVec
	PythonRequestDuration  *prometheus.HistogramVec
	PythonErrors           *prometheus.CounterVec

	// Системные метрики
	ApplicationInfo        *prometheus.GaugeVec
	StartTime              prometheus.Gauge
	MemoryUsage           prometheus.Gauge
	GoroutinesCount       prometheus.Gauge
}

// NewMetrics создает новый экземпляр метрик
func NewMetrics() *Metrics {
	return &Metrics{
		// HTTP метрики
		HTTPRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests",
			},
			[]string{"method", "endpoint", "status"},
		),
		HTTPRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "HTTP request duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "endpoint"},
		),
		HTTPRequestsInFlight: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "http_requests_in_flight",
				Help: "Number of HTTP requests currently being processed",
			},
		),

		// Чат метрики
		ChatRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "chat_requests_total",
				Help: "Total number of chat requests",
			},
			[]string{"model", "use_rag", "status"},
		),
		ChatRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "chat_request_duration_seconds",
				Help:    "Chat request duration in seconds",
				Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30},
			},
			[]string{"model", "use_rag"},
		),
		ChatTokensProcessed: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "chat_tokens_processed_total",
				Help: "Total number of tokens processed in chat",
			},
			[]string{"model", "type"}, // type: prompt, completion
		),
		ActiveConversations: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "active_conversations",
				Help: "Number of active conversations",
			},
		),
		MessagesSaved: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "messages_saved_total",
				Help: "Total number of messages saved to database",
			},
			[]string{"role", "status"}, // role: user, assistant, system
		),

		// UI метрики
		UIComponentsRequests: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "ui_components_requests_total",
				Help: "Total number of UI components requests",
			},
			[]string{"component_type", "status"},
		),
		UISchemaRequests: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "ui_schema_requests_total",
				Help: "Total number of UI schema requests",
			},
			[]string{"schema_name", "status"},
		),

		// База данных метрики
		DatabaseConnections: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "database_connections",
				Help: "Number of active database connections",
			},
		),
		DatabaseQueries: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "database_queries_total",
				Help: "Total number of database queries",
			},
			[]string{"operation", "table", "status"},
		),
		DatabaseQueryDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "database_query_duration_seconds",
				Help:    "Database query duration in seconds",
				Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1},
			},
			[]string{"operation", "table"},
		),
		DatabaseErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "database_errors_total",
				Help: "Total number of database errors",
			},
			[]string{"operation", "table", "error_type"},
		),

		// Python интеграция метрики
		PythonRequestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "python_requests_total",
				Help: "Total number of requests to Python service",
			},
			[]string{"endpoint", "status"},
		),
		PythonRequestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "python_request_duration_seconds",
				Help:    "Python service request duration in seconds",
				Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30},
			},
			[]string{"endpoint"},
		),
		PythonErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "python_errors_total",
				Help: "Total number of Python service errors",
			},
			[]string{"endpoint", "error_type"},
		),

		// Системные метрики
		ApplicationInfo: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "application_info",
				Help: "Application information",
			},
			[]string{"version", "environment", "build_time"},
		),
		StartTime: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "application_start_time_seconds",
				Help: "Application start time in unix timestamp",
			},
		),
		MemoryUsage: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "memory_usage_bytes",
				Help: "Current memory usage in bytes",
			},
		),
		GoroutinesCount: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "goroutines_count",
				Help: "Number of goroutines",
			},
		),
	}
}

// RecordHTTPRequest записывает метрики HTTP запроса
func (m *Metrics) RecordHTTPRequest(method, endpoint, status string, duration time.Duration) {
	m.HTTPRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
	m.HTTPRequestDuration.WithLabelValues(method, endpoint).Observe(duration.Seconds())
}

// RecordChatRequest записывает метрики чат запроса
func (m *Metrics) RecordChatRequest(model string, useRAG bool, status string, duration time.Duration, promptTokens, completionTokens int) {
	ragStr := "false"
	if useRAG {
		ragStr = "true"
	}
	
	m.ChatRequestsTotal.WithLabelValues(model, ragStr, status).Inc()
	m.ChatRequestDuration.WithLabelValues(model, ragStr).Observe(duration.Seconds())
	
	if promptTokens > 0 {
		m.ChatTokensProcessed.WithLabelValues(model, "prompt").Add(float64(promptTokens))
	}
	if completionTokens > 0 {
		m.ChatTokensProcessed.WithLabelValues(model, "completion").Add(float64(completionTokens))
	}
}

// RecordMessageSaved записывает метрики сохранения сообщения
func (m *Metrics) RecordMessageSaved(role, status string) {
	m.MessagesSaved.WithLabelValues(role, status).Inc()
}

// RecordUIRequest записывает метрики UI запроса
func (m *Metrics) RecordUIComponentRequest(componentType, status string) {
	m.UIComponentsRequests.WithLabelValues(componentType, status).Inc()
}

// RecordUISchemaRequest записывает метрики запроса UI схемы
func (m *Metrics) RecordUISchemaRequest(schemaName, status string) {
	m.UISchemaRequests.WithLabelValues(schemaName, status).Inc()
}

// RecordDatabaseQuery записывает метрики запроса к БД
func (m *Metrics) RecordDatabaseQuery(operation, table, status string, duration time.Duration) {
	m.DatabaseQueries.WithLabelValues(operation, table, status).Inc()
	m.DatabaseQueryDuration.WithLabelValues(operation, table).Observe(duration.Seconds())
}

// RecordDatabaseError записывает метрики ошибки БД
func (m *Metrics) RecordDatabaseError(operation, table, errorType string) {
	m.DatabaseErrors.WithLabelValues(operation, table, errorType).Inc()
}

// RecordPythonRequest записывает метрики запроса к Python сервису
func (m *Metrics) RecordPythonRequest(endpoint, status string, duration time.Duration) {
	m.PythonRequestsTotal.WithLabelValues(endpoint, status).Inc()
	m.PythonRequestDuration.WithLabelValues(endpoint).Observe(duration.Seconds())
}

// RecordPythonError записывает метрики ошибки Python сервиса
func (m *Metrics) RecordPythonError(endpoint, errorType string) {
	m.PythonErrors.WithLabelValues(endpoint, errorType).Inc()
}

// SetApplicationInfo устанавливает информацию о приложении
func (m *Metrics) SetApplicationInfo(version, environment, buildTime string) {
	m.ApplicationInfo.WithLabelValues(version, environment, buildTime).Set(1)
	m.StartTime.Set(float64(time.Now().Unix()))
}

// UpdateSystemMetrics обновляет системные метрики
func (m *Metrics) UpdateSystemMetrics() {
	// Здесь можно добавить логику сбора системных метрик
	// Например, использование памяти, количество горутин и т.д.
	m.GoroutinesCount.Set(float64(runtime.NumGoroutine()))
	
	// Можно добавить сбор метрик памяти через runtime.ReadMemStats
}

// Глобальный экземпляр метрик
var AppMetrics *Metrics

// InitMetrics инициализирует глобальные метрики
func InitMetrics() {
	AppMetrics = NewMetrics()
}
