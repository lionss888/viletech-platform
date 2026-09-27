---
name: UX T Form flow tests
overview: 'Автотесты: visibleForms manager drafts, timeline labels, next-step hint,
  document preview helper. [status-sync 2026-09-24 completed] visible-forms + create-review-copy
  + continuity tests'
todos:
- id: t-unit
  content: Vitest + Go unit coverage for C1–C5 behaviors
  status: completed
isProject: false
---

# T — Автотесты флоу заявки (волна UX)

## Rules
тесты-архитектуры, go-testing, playwright-e2e (узкий, если уже есть harness).

## Scope
Unit/service:
- manager hides drafts
- mapComplianceHistory labels
- nextStepHint(role)
- Document preview fetch helper

Playwright: только если локальный e2e harness уже поднимается без нового infra; иначе unit gate достаточен для этой волны.

## DoD
- [x] Новые/обновлённые тесты зелёные
---

> **Status-sync 2026-09-24:** todos/DoD marked completed — code evidence recorded in sync reason. Batch triage archive; do not re-implement.
