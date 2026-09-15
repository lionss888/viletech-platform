# Correlation Logging Money Path

Phase 4 Ops Excellence verification

This document describes correlation identifiers flow for observability across the money path from core through hub to external services.

Correlation Fields

form_payment_id Primary business identifier for a form payment entity lifecycle. Present in all operations related to a specific form from creation through final status transitions.

correlation_id Optional vendor-specific identifier stored in Form.CorrelationID. Used for bank channel webhooks and external system integration where a vendor provides their own tracking ID.

event_id Unique identifier for each hub event envelope ensuring idempotent processing.

request_id HTTP request correlation identifier set by core middleware for tracing client requests.

Core Logging

Context-Based Logger

Package core/pkg/logger provides context-aware structured logging.

logger.WithFormPaymentID(ctx context.Context string formPaymentID) context.Context
Attaches form_payment_id to context.

logger.WithRequestID(ctx context.Context string requestID) context.Context
Attaches request_id to context.

logger.FromContext(ctx context.Context base *slog.Logger) *slog.Logger
Returns logger with correlation fields from context automatically included in all log statements.

Usage Pattern

Core services use this pattern for automatic correlation in all log statements within a context:

func (s *FormPaymentService) Create(ctx context.Context ...) error {
    ctx = logger.WithFormPaymentID(ctx formID)
    logger.FromContext(ctx nil).Info("form created")
    // All subsequent logs in this context automatically include form_payment_id
}

Money Path Operations

Form Creation POST /api/v1/user/form-payment
Core service sets context with form_payment_id immediately after ID generation.
Logs: "form created" with form_payment_id.

Status Transitions Submit approve assign provider execute payment confirm
Core service uses existing context with form_payment_id.
Logs: "form transition" with form_payment_id from to action.

Hub Publication
Core outbox events include FormPaymentID in the envelope.
Hub publisher logs failures with form_payment_id from event.

HTTP Middleware
Core HTTP server middleware adds request_id to context for every incoming request.
All handler logs automatically include request_id via logger.FromContext.

Hub Logging

Context-Based Logger (Enhanced Phase 4)

Package hub/pkg/logger now mirrors core capabilities:

logger.WithEventID(ctx context.Context string eventID) context.Context
Attaches event_id to context.

logger.WithFormPaymentID(ctx context.Context string formPaymentID) context.Context
Attaches form_payment_id to context.

logger.FromContext(ctx context.Context base *slog.Logger) *slog.Logger
Returns logger with event_id and form_payment_id from context automatically included.

Dispatcher Enhancement

Hub dispatcher enriches context before plugin execution:

func (d *Dispatcher) Handle(ctx context.Context env events.Envelope) {
    ctx = logger.WithEventID(ctx env.EventID)
    ctx = logger.WithFormPaymentID(ctx env.FormPaymentID)
    log := logger.FromContext(ctx d.log)
    log.Info("dispatch" "plugin" pluginName "action" action)
    // All plugin logs can now use FromContext for automatic correlation
}

Adapter Logging

All hub adapters (docs mail sms telegram ocr diadoc onec partner) extract form_payment_id from params and include it in:

Structured logs via p.log.Info(...form_payment_id formPaymentID...)
Request bodies sent to external services
Idempotency keys for at-least-once delivery

Example Docs Adapter

func (p *DocsPlugin) Execute(ctx context.Context action string params map[string]any) {
    formPaymentID := params["form_payment_id"].(string)
    p.log.Info("docs generate stub" "form_payment_id" formPaymentID ...)
    body := map[string]any{
        "event_id":        params["event_id"]
        "form_payment_id": formPaymentID
        // ...
    }
    remote.PostJSON(ctx p.baseURL body)
}

External Services

Docs Service (docs-service) Mail Gateway (mail-gateway) SMS Gateway (sms-gateway)
Receive form_payment_id in request body.
Include form_payment_id in their own structured logs.
Return form_payment_id in responses for correlation.

Bank Channel Webhooks
Core publishes bank.webhook events with correlation_id from Form.CorrelationID.
Webhook payload includes correlation_id for vendor tracking.
Webhook signature (X-VDP-Bank-Signature) ensures authenticity.

Verification Phase 4

Core Logger Tests
vdp/core/pkg/logger/logger_test.go verifies WithFormPaymentID and FromContext.

Hub Logger Tests (New)
vdp/hub/pkg/logger/logger_test.go verifies WithEventID WithFormPaymentID and FromContext parity with core.

Dispatcher Context Enrichment
Hub dispatcher now enriches context before plugin execution ensuring all downstream logs can use automatic correlation.

Staging Smoke Test
scripts/staging-smoke.sh exercises form creation submission and external service calls verifying correlation flow end-to-end.

Log Query Examples

Find all logs for a specific form payment:

grep form_payment_id=form-abc123 core.log
grep form_payment_id=form-abc123 hub.log
grep form_payment_id=form-abc123 docs.log
grep form_payment_id=form-abc123 mail.log

Trace HTTP request through core:

grep request_id=req-xyz789 core.log

Trace hub event processing:

grep event_id=evt-456 hub.log

Gap Analysis and Recommendations

Current State (Phase 4 Complete)

Core: Full context-based correlation with form_payment_id and request_id.
Hub: Enhanced with context-based correlation matching core capabilities.
Adapters: Explicit form_payment_id in logs and external requests.
External Services: Receive and log form_payment_id.

Future Enhancements

Distributed Tracing
Consider OpenTelemetry for span-based tracing across core hub and external services with trace_id and span_id propagation.

Adapter Logger Enhancement
Adapters could use logger.FromContext instead of explicit form_payment_id parameters for cleaner code once context is enriched by dispatcher (already available after Phase 4 dispatcher update).

Centralized Log Aggregation
Deploy ELK Loki or similar for queryable structured logs with form_payment_id as indexed field.

Alerting on Orphaned IDs
Alert when form_payment_id appears in hub/external logs but not in recent core logs (potential data inconsistency).

Related Documents

vdp/docs/operations/semantic-alerts.md
vdp/docs/operations/observability.md
vdp/docs/operations/security-signoff-checklist.md

Tests

vdp/core/pkg/logger/logger_test.go
vdp/hub/pkg/logger/logger_test.go
vdp/hub/internal/dispatcher/dispatcher_test.go
vdp/scripts/staging-smoke.sh
