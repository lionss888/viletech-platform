# Semantic Alerts VDP Money Path

Phase 4 Ops Excellence

Business-level alerts for on-call. Not infrastructure CPU or disk but payment processing SLA violations and integration failures.

## Alert Catalog

### Stuck Awaiting Provider

Trigger: Form in status awaiting_provider_assignment for more than 2 hours.

Business Impact: Manager has not assigned provider. Customer blocked on payment initiation.

Action: Review manager ops queue. Check if manager ops service is down. Escalate to manager on-call.

Query Pattern: Count forms where status = awaiting_provider_assignment and updated_at older than 2h.

Severity: warning (under 4h) critical (over 4h).

### Stuck Payment Processing

Trigger: Form in status payment_processing for more than 30 minutes after provider assignment.

Business Impact: Provider may not have received event or external payment system is down. Money transfer delayed.

Action: Check hub outbox for undelivered events to provider. Check provider connector health. Review provider adapter logs for 5xx or timeout. Manual provider notification if needed.

Query Pattern: Count forms where status = payment_processing and (now - provider_assigned_at) older than 30m.

Severity: warning (under 1h) critical (over 2h).

### Stuck Compliance Review

Trigger: Form in status awaiting_compliance_approval for more than 24 hours.

Business Impact: Compliance officer queue not being serviced or officers unavailable. Customer cannot proceed.

Action: Check compliance officer on-call rotation. Review CO queue depth. Escalate to compliance manager.

Query Pattern: Count forms where status = awaiting_compliance_approval and updated_at older than 24h.

Severity: warning (under 48h) critical (over 72h).

### Hub Inbox Failures

Trigger: Hub inbox has more than 10 failed events (status=failed after max retries) in last hour.

Business Impact: Events not reaching plugins. Status transitions may not trigger external notifications or document generation.

Action: Check hub logs for plugin failures. Verify external service URLs (DOCS_URL, MAIL_URL, SMS_URL). Check for schema changes or breaking API updates.

Query Pattern: Count hub.inbox records where status=failed and retry_count greater than or equal to max_retries and created_at within 1h.

Severity: warning (5-10 failures) critical (over 10).

### Docs Generate Failed

Trigger: Docs service returns 5xx or timeout for more than 5 consecutive requests.

Business Impact: Invoices or contracts not generated. Forms cannot progress to compliance review.

Action: Check docs-service health endpoint. Review docs-service logs. Verify DOCS_URL accessibility. Check storage backend (S3 or equivalent).

Query Pattern: Count docs adapter errors in hub logs where http_status greater than or equal to 500 in last 10m.

Severity: warning (3-5 failures) critical (over 5).

### Mail Gateway Unhealthy

Trigger: Mail gateway health endpoint returns non-200 or more than 3 consecutive delivery failures.

Business Impact: User email notifications not sent. Status change alerts delayed.

Action: Check mail-gateway logs. Verify MAIL_URL and SMTP relay. Test with manual notify API call.

Query Pattern: Mail gateway /health returns non-200 or hub mail adapter logs greater than or equal to 3 errors in 5m.

Severity: warning (health check fail) critical (delivery failures).

### SMS Gateway Unhealthy

Trigger: SMS gateway health endpoint returns non-200 or more than 3 consecutive delivery failures.

Business Impact: SMS OTP or status notifications not sent. User may be unable to confirm actions.

Action: Check sms-gateway logs. Verify SMS_URL and provider credentials. Test with manual notify API call.

Query Pattern: SMS gateway /health returns non-200 or hub sms adapter logs greater than or equal to 3 errors in 5m.

Severity: warning (health check fail) critical (delivery failures).

### Refund Processing Delayed

Trigger: Form in status payment_refund_processing for more than 1 hour.

Business Impact: Customer refund delayed. Provider may not have processed refund initiation.

Action: Check provider refund adapter logs. Verify refund event delivery to provider. Manual provider escalation if needed.

Query Pattern: Count forms where status = payment_refund_processing and updated_at older than 1h.

Severity: warning (under 2h) critical (over 4h).

## Prometheus Rules Example

See vdp/ops/prometheus-rules.example.yml for PromQL expressions.

## Thresholds for MVP Pilot

Based on conservative SLA for initial deployment.

awaiting_provider_assignment: warning 2h critical 4h

payment_processing: warning 30m critical 2h

awaiting_compliance_approval: warning 24h critical 72h

hub_inbox_failures: warning 5 critical 10 per hour

docs_generate_failures: warning 3 critical 5 consecutive

mail_gateway_unhealthy: warning health fail critical 3 delivery fails in 5m

sms_gateway_unhealthy: warning health fail critical 3 delivery fails in 5m

payment_refund_processing: warning 1h critical 4h

Adjust thresholds based on observed latency and volume during pilot.

## Deployment to Staging

Requirements: Prometheus or compatible metrics collector with alert manager.

Steps:

Install Prometheus and Alertmanager on staging infrastructure or use managed service.

Configure core and hub to expose /metrics endpoint with OpenMetrics or Prometheus format including vdp_forms_by_status status gauge, vdp_hub_inbox_failed_total counter, and vdp_external_service_errors_total service counter.

Load prometheus-rules.example.yml into Prometheus config as recording rules or alerts.

Configure Alertmanager to route alerts to on-call channel (Telegram, PagerDuty, Slack).

Test alert firing with synthetic stuck form (create form and manually set updated_at to old timestamp in staging DB) or by stopping a gateway service.

Verify alert notifications reach on-call.

## Staging Deployment Evidence Phase 4 Complete

Deployment artifacts ready:

Prometheus rules defined in vdp/ops/prometheus-rules.example.yml. Done.

Alert thresholds documented based on MVP pilot conservative SLA. Done.

Runbook links added to alert annotations. Done.

Deployment script created at vdp/scripts/deploy-alerts-staging.sh. Done.

Verification checklist included in deployment script output. Done.

Awaiting ops infrastructure:

Prometheus deployed to staging with /metrics endpoints from core and hub. Not done.

Alert test (synthetic stuck form) fired and received by on-call channel. Not done.

Alertmanager configured with on-call notification channel. Not done.

Phase 4 deliverable met: Alert rules deployment process is defined and ready for ops execution when staging Prometheus infrastructure is provisioned.

## Gaps and Future Work

Distributed Tracing: Currently logs only. Consider Jaeger or OTel for span-based latency analysis.

SLO Tracking: Define SLIs (for example 95th percentile payment_processing latency under 10m) and track via Prometheus recording rules.

Automated Remediation: Some alerts (for example hub inbox poison events) could trigger automated replay or DLQ inspection.

Multi-Region: Alerting strategy assumes single-region deployment. Multi-region requires region-aware alert routing.

## Related Documents

[observability.md](observability.md)

[correlation-logging.md](correlation-logging.md)

[stuck-payment.md](runbooks/stuck-payment.md)

[hub-failure.md](runbooks/hub-failure.md)

vdp/ops/prometheus-rules.example.yml
