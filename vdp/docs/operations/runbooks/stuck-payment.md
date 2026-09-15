# Runbook Stuck Payment Processing

Alert: VDPStuckPaymentProcessing / VDPStuckPaymentProcessingCritical

Triggered when form remains in payment_processing status for more than configured threshold after provider assignment.

## Severity

Warning: Over 30 minutes.

Critical: Over 2 hours.

## Business Impact

Customer payment transfer delayed. Provider may not have received assignment event or external payment system is experiencing issues. Money is not moving.

## Initial Assessment (First 5 Minutes)

Identify affected forms.

Query logs for forms in payment_processing status: grep status.*payment_processing core.log | grep form_payment_id | tail -20

Check time since provider assignment. If over threshold, proceed.

Check provider assignment event delivery.

Query hub outbox for undelivered events: grep form_payment_id=FORM_ID hub.log | grep provider_assigned

Verify event was published to hub.

Check provider plugin execution status.

Query hub dispatcher logs: grep form_payment_id=FORM_ID hub.log | grep dispatch.*1c|partner

Look for plugin errors, timeouts, or missing executions.

## Diagnosis

### Provider Event Not Sent

Symptom: No provider assignment event in hub logs for the form.

Cause: Core outbox flush failure or hub publish error.

Action: Check core logs for outbox.Flush errors. Verify HUB_URL connectivity from core. Check HUB_SHARED_SECRET validity. Manually trigger outbox flush if needed (restart core or wait for next flush cycle).

### Provider Plugin Failed

Symptom: Hub dispatcher shows plugin execution error for form.

Cause: Provider adapter returned error, timeout, or 5xx from external system.

Action: Check provider adapter logs for HTTP status codes and error messages. Verify provider external URL is accessible. Check provider credentials and API key validity. Review provider adapter circuit breaker status. If provider API is down, document and escalate to provider on-call.

### Provider Received Event But No Status Update

Symptom: Hub shows successful dispatch to provider but no status transition callback.

Cause: Provider processed payment but callback webhook failed or provider is waiting for manual confirmation.

Action: Check if provider system requires manual confirmation (non-automated flow). Verify core callback endpoint is accessible from provider network. Check provider webhook signature if applicable. Contact provider support to confirm payment status. If payment confirmed externally, manually update form status in core DB as last resort (with audit log entry).

### Hub Inbox Poison Event

Symptom: Hub inbox shows failed status for provider callback event.

Cause: Callback payload schema mismatch or core API rejected the update.

Action: Query hub inbox for failed events related to form_payment_id. Inspect event payload and error message. If schema issue, fix adapter and replay event manually. If core API issue, check core logs for rejection reason.

## Resolution Steps

### Short-Term Fix (Restore Service)

If provider event not sent: Restart core service to trigger outbox flush. Verify event delivery via hub logs.

If provider plugin failed: Check provider system status page. If provider is up but adapter is misconfigured, fix credentials and retry. If provider is down, estimate ETA and notify customer.

If callback failed: Manually verify payment status with provider. Update form status in DB if confirmed (document in incident log). Fix callback issue for future events.

### Long-Term Prevention

Add alert for core outbox stuck events (no flush for N minutes).

Implement provider adapter health check endpoint with automated testing.

Add idempotency key tracking to detect duplicate payment attempts.

Improve provider callback retry logic with exponential backoff.

Consider dead-letter queue for failed hub inbox events with manual review process.

## Escalation

Warning (30m): On-call engineer investigates and attempts resolution.

Critical (2h): Escalate to lead engineer and provider technical contact.

Severe (4h): Escalate to product manager and consider manual payment processing outside system.

## Verification After Resolution

Check form status transitioned to expected next state (for example payment_sent or payment_confirmed).

Verify no other forms stuck in same status with same provider.

Review hub outbox and inbox for any accumulated failures.

Notify customer of resolution and estimated payment completion time.

## Post-Incident

Document root cause in incident report.

Update alert thresholds if incident revealed gap in monitoring.

Add test case for identified failure mode if not covered.

Review provider SLA and escalation path if provider outage was cause.

## Related Documents

[semantic-alerts.md](../semantic-alerts.md)

[correlation-logging.md](../correlation-logging.md)

[observability.md](../observability.md)
