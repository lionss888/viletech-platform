package tracing

import (
	"context"
	"sync"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// JaegerTracer implements Tracer using Jaeger
type JaegerTracer struct {
	config *TracerConfig
	logger logger.Logger
	spans  map[SpanID]Span
	traces map[TraceID]*Trace
	mu     sync.RWMutex
}

// NewJaegerTracer creates a new Jaeger tracer
func NewJaegerTracer(config *TracerConfig, logger logger.Logger) *JaegerTracer {
	return &JaegerTracer{
		config: config,
		logger: logger,
		spans:  make(map[SpanID]Span),
		traces: make(map[TraceID]*Trace),
	}
}

// StartSpan starts a new span
func (t *JaegerTracer) StartSpan(ctx context.Context, name string, kind SpanKind) (context.Context, Span) {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Generate trace ID and span ID
	traceID := TraceID(uuid.New().String())
	spanID := SpanID(uuid.New().String())

	// Check if we have a parent span
	parentID := SpanID("")
	if parentSpan := t.getSpanFromContext(ctx); parentSpan != nil {
		traceID = parentSpan.TraceID
		parentID = parentSpan.SpanID
	}

	// Create new span
	span := Span{
		TraceID:    traceID,
		SpanID:     spanID,
		ParentID:   parentID,
		Name:       name,
		Kind:       kind,
		StartTime:  time.Now(),
		Status:     SpanStatusOK,
		Tags:       make(map[string]string),
		Logs:       make([]SpanLog, 0),
		Attributes: make(map[string]interface{}),
	}

	// Store span
	t.spans[spanID] = span

	// Add to trace
	if trace, exists := t.traces[traceID]; exists {
		trace.Spans = append(trace.Spans, span)
	} else {
		t.traces[traceID] = &Trace{
			TraceID:   traceID,
			Spans:     []Span{span},
			StartTime: span.StartTime,
		}
	}

	// Add span to context
	ctx = context.WithValue(ctx, "span", span)

	t.logger.Debugf("Started span: %s (trace: %s)", name, traceID)
	return ctx, span
}

// FinishSpan finishes a span
func (t *JaegerTracer) FinishSpan(ctx context.Context, span Span) {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Update span end time
	span.EndTime = time.Now()
	span.Duration = span.EndTime.Sub(span.StartTime)

	// Update span in storage
	t.spans[span.SpanID] = span

	// Update trace
	if trace, exists := t.traces[span.TraceID]; exists {
		// Update span in trace
		for i, s := range trace.Spans {
			if s.SpanID == span.SpanID {
				trace.Spans[i] = span
				break
			}
		}

		// Update trace end time
		if span.EndTime.After(trace.EndTime) {
			trace.EndTime = span.EndTime
			trace.Duration = trace.EndTime.Sub(trace.StartTime)
		}
	}

	t.logger.Debugf("Finished span: %s (duration: %v)", span.Name, span.Duration)
}

// AddSpanTag adds a tag to a span
func (t *JaegerTracer) AddSpanTag(span Span, key, value string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	span.Tags[key] = value
	t.spans[span.SpanID] = span

	t.logger.Debugf("Added tag to span %s: %s=%s", span.Name, key, value)
}

// AddSpanLog adds a log entry to a span
func (t *JaegerTracer) AddSpanLog(span Span, message string, fields map[string]interface{}) {
	t.mu.Lock()
	defer t.mu.Unlock()

	log := SpanLog{
		Timestamp: time.Now(),
		Message:   message,
		Fields:    fields,
	}

	span.Logs = append(span.Logs, log)
	t.spans[span.SpanID] = span

	t.logger.Debugf("Added log to span %s: %s", span.Name, message)
}

// SetSpanStatus sets the status of a span
func (t *JaegerTracer) SetSpanStatus(span Span, status SpanStatus) {
	t.mu.Lock()
	defer t.mu.Unlock()

	span.Status = status
	t.spans[span.SpanID] = span

	t.logger.Debugf("Set span %s status to: %s", span.Name, status)
}

// GetTrace returns a trace by ID
func (t *JaegerTracer) GetTrace(ctx context.Context) *Trace {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if span := t.getSpanFromContext(ctx); span != nil {
		if trace, exists := t.traces[span.TraceID]; exists {
			return trace
		}
	}

	return nil
}

// GetSpan returns the current span from context
func (t *JaegerTracer) GetSpan(ctx context.Context) *Span {
	return t.getSpanFromContext(ctx)
}

// getSpanFromContext extracts span from context
func (t *JaegerTracer) getSpanFromContext(ctx context.Context) *Span {
	if span, ok := ctx.Value("span").(Span); ok {
		return &span
	}
	return nil
}

// ExportTrace exports a trace to Jaeger
func (t *JaegerTracer) ExportTrace(trace *Trace) error {
	// TODO: Implement actual Jaeger export
	// This would typically involve:
	// 1. Converting trace to Jaeger format
	// 2. Sending to Jaeger collector
	// 3. Handling errors and retries

	t.logger.Infof("Exporting trace: %s (%d spans)", trace.TraceID, len(trace.Spans))
	return nil
}

// ExportSpans exports spans to Jaeger
func (t *JaegerTracer) ExportSpans(spans []Span) error {
	// TODO: Implement actual Jaeger export
	// This would typically involve:
	// 1. Converting spans to Jaeger format
	// 2. Sending to Jaeger collector
	// 3. Handling errors and retries

	t.logger.Infof("Exporting %d spans", len(spans))
	return nil
}

// Close closes the tracer
func (t *JaegerTracer) Close() error {
	t.logger.Info("Closing Jaeger tracer")
	return nil
}

// GetTraces returns all traces
func (t *JaegerTracer) GetTraces() map[TraceID]*Trace {
	t.mu.RLock()
	defer t.mu.RUnlock()

	traces := make(map[TraceID]*Trace)
	for traceID, trace := range t.traces {
		traces[traceID] = trace
	}

	return traces
}

// GetSpans returns all spans
func (t *JaegerTracer) GetSpans() map[SpanID]Span {
	t.mu.RLock()
	defer t.mu.RUnlock()

	spans := make(map[SpanID]Span)
	for spanID, span := range t.spans {
		spans[spanID] = span
	}

	return spans
}

// ClearTraces clears all traces
func (t *JaegerTracer) ClearTraces() {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.traces = make(map[TraceID]*Trace)
	t.spans = make(map[SpanID]Span)
	t.logger.Info("Traces cleared")
}
