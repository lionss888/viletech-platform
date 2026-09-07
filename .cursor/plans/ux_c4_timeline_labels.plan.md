---
name: UX C4 Timeline labels
overview: "Хронология: человекопонятные лейблы статусов через STATUS_META."
todos:
  - id: c4-mapper
    content: mapComplianceHistory через statusMeta labels
    status: pending
  - id: c4-test
    content: mappers.test.ts assert Russian labels
    status: pending
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
- [ ] UI shows «Создаётся… → Черновик» not snake_case
---
