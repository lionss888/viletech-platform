---
name: UX C3 Manager hide drafts
overview: Менеджер не видит клиентские creating/draft в list/get и FE visibleForms.
  [status-sync 2026-09-24 completed] visible-forms.test.ts
todos:
- id: c3-core
  content: CanSeeForm exclude creating/draft for manager + Go tests
  status: completed
- id: c3-fe
  content: visibleForms filter + vitest
  status: completed
isProject: false
---

# C3 — Скрыть черновики от менеджера

## Rules
**Обязательны:** безопасность-ролей-и-данных, use-cases, go-testing, тесты-архитектуры.
**Вне scope:** ICO/ECO/root visibility change; treasurer (оставить как сейчас, если не manager).

## Fix
- `CanSeeForm`: RoleManager → false для StatusCreating/StatusDraft
- FE `visibleForms`: manager excludes creating/draft
- Update `TestCanSeeFormZones` + visible-forms.test.ts

## DoD
- [x] Manager list/get draft → deny
- [x] Manager видит organization_waiting_verification+
---

> **Status-sync 2026-09-24:** todos/DoD marked completed — code evidence recorded in sync reason. Batch triage archive; do not re-implement.
