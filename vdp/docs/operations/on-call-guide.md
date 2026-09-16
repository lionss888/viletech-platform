# On-Call Guide VDP Platform

Phase 4 Ops Excellence

On-call engineer responsibilities for VDP money path and integrations. Production and pilot deployments.

## Customer handover

Milestone 1 import-pilot 2026-09-15. This page plus runbooks stuck-payment and hub-failure are the on-call transfer artifact after local handover command green. Public alpha core health 200. Rotation names and paging roster remain with the customer. Live metrics and alerting still await ops infrastructure. Until the customer names a replacement, contractor primary coverage for the alpha contour follows this guide. Secondary and manager seats are customer-owned. Rollback steps live in deploy-rollback.md. After freeze of a preemptible VM, restart the compose stack and confirm core health on the public host. Remote SSH rotate stays blocked until the deploy key is refreshed.

On-Call Rotation

Primary On-Call: Responds to critical alerts within 15 minutes, investigates and resolves or escalates within 1 hour.

Secondary On-Call: Backup for primary, responds if primary not available within 30 minutes.

Manager On-Call: Escalation point for business decisions and cross-team coordination.

Rotation Schedule: To be configured in PagerDuty or equivalent based on team availability.

Alert Channels

Telegram: On-call bot posts alerts to dedicated channel with severity tag.

PagerDuty: High-priority alerts trigger phone call to primary on-call.

Slack: Low-priority warnings posted to engineering channel for situational awareness.

Email: Digest of all alerts sent to eng-oncall mailing list.

Alert Severity Levels

Critical: Immediate customer impact, money movement blocked, security breach. Response required within 15 minutes. Examples: stuck payment critical, hub completely down, docs service unavailable for all forms.

Warning: Potential customer impact, degraded performance, approaching SLA breach. Response required within 1 hour. Examples: stuck payment warning, partial hub failures, gateway health check failing.

Info: No immediate customer impact, monitoring threshold crossed. Review during business hours. Examples: increased error rate but below critical threshold, slow query warnings.

Runbook Index

Each alert includes runbook_url annotation linking to specific playbook.

Stuck Payment: vdp/docs/operations/runbooks/stuck-payment.md
Alert: VDPStuckPaymentProcessing

Hub Failures: vdp/docs/operations/runbooks/hub-failure.md
Alert: VDPHubInboxFailures

Compliance Backlog: (To be created when compliance workflow goes live)
Alert: VDPStuckComplianceReview

Gateway Unhealthy: vdp/docs/operations/runbooks/gateway-unhealthy.md (placeholder)
Alert: VDPMailGatewayUnhealthy, VDPSMSGatewayUnhealthy

Docs Service Down: vdp/docs/operations/runbooks/docs-service-down.md (placeholder)
Alert: VDPDocsServiceErrors

Refund Stuck: vdp/docs/operations/runbooks/stuck-refund.md (placeholder)
Alert: VDPStuckRefundProcessing

On-Call Tooling Access

Staging Environment: SSH access to staging VM, docker compose commands, log access.

Production Environment: Read-only database access, log aggregator (ELK or equivalent), metrics dashboard (Grafana or equivalent).

Hub Admin API: (To be deployed) Event replay and inbox inspection endpoints.

Core Admin API: (To be deployed) Form status inspection and manual status override (emergency use only).

Escalation Paths

Technical Escalation

Level 1 (Primary On-Call): Investigate using runbooks, attempt standard resolution.

Level 2 (Secondary On-Call or Lead Engineer): Complex issues requiring deep system knowledge or code changes.

Level 3 (Platform Architect): Architectural decisions, major outages, security incidents.

Business Escalation

Product Manager: Customer communication, SLA negotiations, feature prioritization during incident.

Compliance Manager: Compliance review backlog, regulatory concerns.

Provider Technical Contact: Provider system outages, API changes, integration issues.

Common On-Call Scenarios

Scenario: Alert Fires During Business Hours

Acknowledge alert in PagerDuty or Telegram.

Open runbook and follow initial assessment steps.

Post status update in engineering channel within 15 minutes.

Resolve or escalate within 1 hour.

Document incident in incident log after resolution.

Scenario: Alert Fires Outside Business Hours

Acknowledge alert to stop further notifications.

Assess severity: Can it wait until morning, or is immediate action required?

If critical and affecting active customers, follow runbook immediately.

If warning and no active customer impact, document for morning follow-up.

Post brief status in on-call channel.

Scenario: Multiple Alerts Firing Simultaneously

Triage by customer impact: stuck payments > compliance backlog > notifications.

Check for common root cause (e.g. hub service down affects all plugins).

Resolve root cause first to clear cascading alerts.

Request secondary on-call to assist if multiple unrelated incidents.

Scenario: Runbook Does Not Resolve Issue

Document what was tried and what failed.

Collect diagnostic information (logs, metrics, error messages).

Escalate to Level 2 with context.

Keep alert open and update status regularly.

Scenario: Provider System Down (External)

Confirm provider outage is not on VDP side.

Check provider status page or contact provider support.

Estimate resolution time and document in incident log.

Notify affected customers via product manager if outage exceeds 2 hours.

Consider manual payment processing workaround if critical.

Handoff Procedure

At end of on-call shift, brief incoming on-call on any open incidents and current status, recent alerts and resolutions, upcoming maintenance or deployments, and known issues or workarounds.

Update on-call log with summary of shift activity.

On-Call Log

Maintain log of all incidents during shift in shared document or incident tracking system.

Template:

Timestamp: 2026-09-15 14:30
Alert: VDPStuckPaymentProcessing
Severity: Warning
Form ID: form-abc-123
Root Cause: Provider timeout due to network issue
Resolution: Provider connectivity restored after 20 minutes, event replayed successfully
Duration: 25 minutes
Escalated: No
Post-incident required: No

Best Practices

Do not make changes to production database without consulting runbook or escalating.

Always test resolution in staging first if time permits.

Document every action taken during incident for post-incident review.

Communicate proactively: post status updates even if no resolution yet.

Use correlation fields (form_payment_id, event_id, request_id) to trace incidents across services.

After resolving critical incident, review affected forms to ensure no side effects.

Do not ignore warning alerts: they often precede critical incidents.

On-Call Compensation and Support

On-call engineers receive compensation for availability and incident response time according to company policy.

Mental health support and burnout prevention: rotate frequently, limit consecutive on-call weeks, encourage handoff and escalation.

Blameless post-incident review culture: focus on system improvements, not individual fault.

Training and Onboarding

New on-call engineers should shadow experienced on-call for at least two shifts, complete runbook dry-run exercises, have access to all required tools and credentials, and understand escalation paths and contact information.

Quarterly on-call training sessions to review new runbooks and system changes.

Related Documents

vdp/docs/operations/semantic-alerts.md
vdp/docs/operations/observability.md
vdp/docs/operations/correlation-logging.md
vdp/docs/operations/runbooks (all runbooks)
