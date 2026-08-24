package tracing

import (
	"context"
	"time"
)

// TraceID represents a trace ID
type TraceID string

// SpanID represents a span ID
type SpanID string

// SpanStatus represents the status of a span
type SpanStatus string

const (
	SpanStatusOK    SpanStatus = "ok"
	SpanStatusError SpanStatus = "error"
)

// SpanKind represents the kind of span
type SpanKind string

const (
	SpanKindClient   SpanKind = "client"
	SpanKindServer   SpanKind = "server"
	SpanKindProducer SpanKind = "producer"
	SpanKindConsumer SpanKind = "consumer"
	SpanKindInternal SpanKind = "internal"
)

// Span represents a tracing span
type Span struct {
	TraceID    TraceID                `json:"trace_id"`
	SpanID     SpanID                 `json:"span_id"`
	ParentID   SpanID                 `json:"parent_id"`
	Name       string                 `json:"name"`
	Kind       SpanKind               `json:"kind"`
	StartTime  time.Time              `json:"start_time"`
	EndTime    time.Time              `json:"end_time"`
	Duration   time.Duration          `json:"duration"`
	Status     SpanStatus             `json:"status"`
	Tags       map[string]string      `json:"tags"`
	Logs       []SpanLog              `json:"logs"`
	Attributes map[string]interface{} `json:"attributes"`
}

// SpanLog represents a log entry in a span
type SpanLog struct {
	Timestamp time.Time              `json:"timestamp"`
	Fields    map[string]interface{} `json:"fields"`
	Message   string                 `json:"message"`
}

// Trace represents a complete trace
type Trace struct {
	TraceID   TraceID       `json:"trace_id"`
	Spans     []Span        `json:"spans"`
	StartTime time.Time     `json:"start_time"`
	EndTime   time.Time     `json:"end_time"`
	Duration  time.Duration `json:"duration"`
}

// TracerConfig represents configuration for tracing
type TracerConfig struct {
	Enabled        bool    `json:"enabled"`
	JaegerEndpoint string  `json:"jaeger_endpoint"`
	ServiceName    string  `json:"service_name"`
	Environment    string  `json:"environment"`
	Version        string  `json:"version"`
	SampleRate     float64 `json:"sample_rate"`
}

// Tracer defines the interface for distributed tracing
type Tracer interface {
	StartSpan(ctx context.Context, name string, kind SpanKind) (context.Context, Span)
	FinishSpan(ctx context.Context, span Span)
	AddSpanTag(span Span, key, value string)
	AddSpanLog(span Span, message string, fields map[string]interface{})
	SetSpanStatus(span Span, status SpanStatus)
	GetTrace(ctx context.Context) *Trace
	GetSpan(ctx context.Context) *Span
	Close() error
}

// SpanContext represents the context of a span
type SpanContext struct {
	TraceID TraceID           `json:"trace_id"`
	SpanID  SpanID            `json:"span_id"`
	Baggage map[string]string `json:"baggage"`
}

// TraceContext represents the context of a trace
type TraceContext struct {
	TraceID      TraceID `json:"trace_id"`
	ParentID     SpanID  `json:"parent_id"`
	SamplingRate float64 `json:"sampling_rate"`
	Flags        int     `json:"flags"`
}

// TraceHeaders represents HTTP headers for trace propagation
type TraceHeaders struct {
	TraceID      string `json:"trace_id"`
	SpanID       string `json:"span_id"`
	ParentID     string `json:"parent_id"`
	SamplingRate string `json:"sampling_rate"`
	Flags        string `json:"flags"`
}

// TraceExporter defines the interface for exporting traces
type TraceExporter interface {
	ExportTrace(trace *Trace) error
	ExportSpans(spans []Span) error
	Close() error
}

// TraceSampler defines the interface for trace sampling
type TraceSampler interface {
	ShouldSample(traceID TraceID, operation string) bool
	GetSampleRate() float64
}

// TraceProcessor defines the interface for processing traces
type TraceProcessor interface {
	ProcessSpan(span Span) error
	ProcessTrace(trace *Trace) error
	Close() error
}

// TraceAnalyzer defines the interface for analyzing traces
type TraceAnalyzer interface {
	AnalyzeTrace(trace *Trace) *TraceAnalysis
	AnalyzeSpans(spans []Span) *SpanAnalysis
	GetTraceMetrics(traceID TraceID) *TraceMetrics
}

// TraceAnalysis represents the analysis of a trace
type TraceAnalysis struct {
	TraceID        TraceID       `json:"trace_id"`
	TotalDuration  time.Duration `json:"total_duration"`
	SpanCount      int           `json:"span_count"`
	ErrorCount     int           `json:"error_count"`
	SlowestSpan    Span          `json:"slowest_span"`
	FastestSpan    Span          `json:"fastest_span"`
	AverageLatency time.Duration `json:"average_latency"`
	Bottlenecks    []Span        `json:"bottlenecks"`
}

// SpanAnalysis represents the analysis of spans
type SpanAnalysis struct {
	TotalSpans     int           `json:"total_spans"`
	ErrorSpans     int           `json:"error_spans"`
	AverageLatency time.Duration `json:"average_latency"`
	SlowestSpans   []Span        `json:"slowest_spans"`
	ErrorSpansList []Span        `json:"error_spans_list"`
}

// TraceMetrics represents metrics for a trace
type TraceMetrics struct {
	TraceID        TraceID       `json:"trace_id"`
	RequestCount   int           `json:"request_count"`
	ErrorCount     int           `json:"error_count"`
	SuccessRate    float64       `json:"success_rate"`
	AverageLatency time.Duration `json:"average_latency"`
	P95Latency     time.Duration `json:"p95_latency"`
	P99Latency     time.Duration `json:"p99_latency"`
}
