---
name: UX C4 Timeline labels
overview: 'Хронология: человекопонятные лейблы статусов через STATUS_META. [status-sync
  2026-09-24 completed] STATUS_META'
todos:
- id: c4-mapper
  content: mapComplianceHistory через statusMeta labels
  status: completed
- id: c4-test
  content: mappers.test.ts assert Russian labels
  status: completed
isProject: false
---

# C4 — Человекопонятная хронология

## Rules
**Обязательны:** ui-web-практики, поддержка-и-обратная-связь, typescript-clean-code.
**Вне scope:** смена доменных кодов статусов.

## Fix
`mapComplianceHistory` в `mappers.ts`: `statusMeta(from).label → statusMeta(to).label`
Map actor from API role if present; else omit hardcoded manager.

## DoD
- [x] UI shows «Создаётся… → Черновик» not snake_case
---

> **Status-sync 2026-09-24:** todos/DoD marked completed — code evidence recorded in sync reason. Batch triage archive; do not re-implement.
