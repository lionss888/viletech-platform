# Runbook Hub Inbox Failures

Alert: VDPHubInboxFailures / VDPHubInboxFailuresCritical

Triggered when hub inbox accumulates failed events (status=failed after max retries) exceeding threshold.

## Severity

Warning: 5-10 failed events in last hour.

Critical: Over 10 failed events in last hour.

## Business Impact

Events not reaching plugins. Status transitions may not trigger external notifications, document generation, or provider dispatches. Forms may appear stuck to users despite core processing.

## Initial Assessment (First 5 Minutes)

Query failed events from hub inbox.

Check hub database for recent failures. Example query: SELECT event_id, event_type, form_payment_id, retry_count, error, created_at FROM hub.inbox WHERE status = failed AND created_at > NOW() - INTERVAL 1 hour ORDER BY created_at DESC LIMIT 20.

Or via logs: grep inbox.*failed hub.log | tail -20

Identify common failure pattern. One event_type (for example docs.generate or mail.notify). One plugin (docs, mail, sms, telegram). Schema or payload issue versus external service issue.

Check plugin health.

For each failing plugin, check adapter logs: grep plugin.*docs|mail|sms hub.log | grep error|timeout|5xx

Verify external service URLs are set and reachable: curl -I DOCS_URL, curl -I MAIL_URL, curl -I SMS_URL.

## Diagnosis

### External Service Down

Symptom: All failures for one plugin type (for example docs.generate) with 5xx or timeout errors.

Cause: External service (docs-service, mail-gateway, sms-gateway) is down or unreachable.

Action: Check external service health endpoint. Verify service is running (docker ps or systemctl status). Check service logs for crash or OOM. Restart service if needed. Verify network connectivity and firewall rules.

### Schema Mismatch or Breaking Change

Symptom: Failures started after a deployment with error messages about missing fields or invalid payload.

Cause: Core changed event payload structure but hub adapter not updated, or external service API changed.

Action: Review recent deployments to core, hub, or external services. Inspect failed event payload in hub inbox table. Compare with expected schema in hub adapter code. If core schema changed, deploy hub adapter fix. If external service API changed, update adapter to match. Manually replay failed events after fix.

### Plugin Code Bug

Symptom: Failures for specific form_payment_id or payload values, not all events of that type.

Cause: Hub adapter has bug in handling edge case (nil value, special characters, large payload).

Action: Identify failing event characteristics from payload inspection. Reproduce locally with synthetic event matching payload. Fix bug in hub adapter. Deploy fix. Manually replay failed events.

### Resource Exhaustion

Symptom: Hub service logs show memory or connection pool exhaustion, timeouts on all plugins.

Cause: Hub process under heavy load, database connection pool exhausted, or memory leak.

Action: Check hub process memory and CPU usage. Check database connection count and pool limits. Restart hub service to recover. Review recent traffic spike or load pattern change. Scale hub horizontally if sustained high load.

### Configuration Error

Symptom: Failures after configuration change with errors about missing URL or invalid credentials.

Cause: Environment variable not set, secret rotation incomplete, or typo in configuration.

Action: Verify all required env vars are set (DOCS_URL, MAIL_URL, SMS_URL). Check secret values if recently rotated. Compare staging and prod configurations for discrepancies. Correct configuration and restart hub.

## Resolution Steps

### Short-Term Fix (Restore Event Flow)

If external service down: Restart service. Verify health endpoint returns 200. Monitor hub logs for successful plugin executions.

If schema issue: Deploy hotfix for adapter. Manually replay failed events via SQL or hub admin API if available.

If configuration error: Correct env vars or secrets. Restart hub service. Verify events start processing.

### Long-Term Prevention

Add pre-deployment contract tests between core events and hub adapters to catch schema mismatches.

Implement health check aggregation endpoint in hub exposing all plugin health.

Add plugin circuit breaker to prevent cascading failures when external service is degraded.

Implement dead-letter queue UI for manual review and replay of poison events.

Add capacity planning alerts for hub service resource usage before exhaustion.

## Failed Event Replay Procedure

After fixing root cause, replay failed events to unblock affected forms.

Identify failed event IDs: SELECT event_id, form_payment_id FROM hub.inbox WHERE status = failed.

Reset event status to pending for retry: UPDATE hub.inbox SET status = pending, retry_count = 0, error = NULL WHERE event_id IN (...).

Trigger hub inbox processing: Restart hub service, or call hub admin API /admin/inbox/flush if available, or wait for next scheduled flush cycle.

Verify events processed successfully: SELECT event_id, status FROM hub.inbox WHERE event_id IN (...).

Check affected forms transitioned to expected status in core.

## Escalation

Warning (5-10 failures): On-call engineer investigates and attempts resolution within 30 minutes.

Critical (10+ failures): Escalate to lead engineer immediately. Consider pausing new form submissions if event backlog is growing.

Severe (50+ failures or hub service down): Escalate to platform on-call and incident commander. Coordinate with customer support to notify users of delays.

## Verification After Resolution

Hub inbox no longer accumulating failed events (query returns 0 for last 10 minutes).

Affected forms have transitioned to expected status.

External services responding with 2xx status codes.

No error spikes in hub logs.

## Post-Incident

Document root cause and affected event types in incident report.

Add automated test for identified failure scenario.

Review and update hub retry logic if max retries was insufficient.

Consider adding pre-deployment integration tests for hub plugins.

Update alert thresholds if incident revealed inadequate monitoring.

## Related Documents

[semantic-alerts.md](../semantic-alerts.md)

[correlation-logging.md](../correlation-logging.md)

[observability.md](../observability.md)

[staging-checklist.md](../staging-checklist.md)
