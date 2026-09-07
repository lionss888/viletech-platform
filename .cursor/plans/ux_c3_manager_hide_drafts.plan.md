---
name: UX C3 Manager hide drafts
overview: "Менеджер не видит клиентские creating/draft в list/get и FE visibleForms."
todos:
  - id: c3-core
    content: CanSeeForm exclude creating/draft for manager + Go tests
    status: pending
  - id: c3-fe
    content: visibleForms filter + vitest
    status: pending
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
- [ ] Manager list/get draft → deny
- [ ] Manager видит organization_waiting_verification+
---
