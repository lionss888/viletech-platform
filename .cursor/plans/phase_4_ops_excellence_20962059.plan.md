---
name: Phase 4 Ops Excellence
overview: "Deployed monitoring: semantic alerts, runbooks, SLA/on-call. После staging live. Срок 2-3 дня по ритму 3.8 todo/ч."
todos:
  - id: ops-correlation
    content: Correlation form_id на money path staging
    status: pending
  - id: ops-alerts-deploy
    content: Deploy semantic alerts на staging
    status: pending
  - id: ops-runbook-dryrun
    content: Runbook dry-run stuck-payment + hub-failure
    status: pending
  - id: ops-oncall
    content: On-call page + security Observability closed
    status: pending
  - id: ops-docs
    content: "Docs gaps/readiness: deployed alerting evidence"
    status: pending
isProject: false
---

# Phase 4: Operational Excellence

## Цель и оценка

**Цель:** live observability money/compliance path, не только docs baseline.  
**Срок:** 2–3 рабочих дня (~16–24 ч).  
**Базис:** ~12 todos × 3.8 todo/ч + ops wiring.  
**Зависит от:** Phase 3 (staging с live сервисами).

## Артефакты

- [`vdp/docs/operations/semantic-alerts.md`](vdp/docs/operations/semantic-alerts.md)
- [`vdp/ops/prometheus-rules.example.yml`](vdp/ops/prometheus-rules.example.yml)
- [`vdp/docs/operations/runbooks/stuck-payment.md`](vdp/docs/operations/runbooks/stuck-payment.md)
- [`vdp/docs/operations/runbooks/hub-failure.md`](vdp/docs/operations/runbooks/hub-failure.md)
- [`vdp/docs/operations/observability.md`](vdp/docs/operations/observability.md)

## Работы

### 1. Correlation на money path (3–4 ч)

Проверить structured logs: `correlation_id` + `form_payment_id` сквозь core → hub → docs/mail на staging. Добить пробелы в handlers при необходимости.

### 2. Deploy semantic alerts (6–8 ч)

Выкатить правила из semantic-alerts / prometheus example на staging:

- stuck awaiting provider
- stuck compliance
- hub inbox failures
- mail/sms gateway unhealthy
- docs generate failed

Пороги N минут — согласовать под пилот SLA (зафиксировать в alerts doc).

### 3. Runbooks + on-call dry-run (4–6 ч)

- Пройти stuck-payment и hub-failure на staging (симулированный инцидент)
- Краткая on-call page: кто, канал, эскалация
- Security checklist Observability → выполнено

### 4. Docs sync (2 ч)

- known-gaps: «deployed alerting» больше не «только ops-side pending» если реально выкатили
- readiness: prod score bump только после evidence

## DoD / Gate

1. Alerts firing test (synthetic) на staging
2. Runbook dry-run documented
3. Correlation id виден в логах платежного пути
4. security-signoff Observability closed

## Rules

`устойчивость-и-наблюдаемость`, `честность-готовности`, `mgmt-tg-notify` (опционально progress после dry-run).

## Связь

Завершает блок prod-ready → Milestone 1. Не открывает export/refunds.
