---
name: AP4 Selective publish
overview: POST /api/publish + UI превью выбранного → TG (manager/operator); sanitize.
  [status-sync 2026-09-24 DoD] AP4 implemented; DoD sync
todos:
- id: ap4-api
  content: POST /api/publish source+text+target+sanitize
  status: completed
- id: ap4-ui
  content: Отправить выбранное с превью; plan summary optional
  status: completed
- id: ap4-tests
  content: Unit sanitize + 401; smoke TG
  status: completed
isProject: false
---

# AP4 — Selective publish → TG

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)
**Зависимость:** после AP2a; сильнее с AP3.

## Сверка с rules

**Обязательны:** `mgmt-tg-notify`, `безопасность-ролей-и-данных`, `ui-web-практики`, `go-testing`.
**Вне scope:** auto-publish без превью.

## DoD

- [x] Выбранный текст в TG
- [x] Tech-leak strip
- [x] React без vanilla

> **Status-sync 2026-09-24:** todos/DoD marked completed — code evidence recorded in sync reason. Batch triage archive; do not re-implement.
