---
name: AP4 Selective publish
overview: "POST /api/publish + UI превью выбранного → TG (manager/operator); sanitize."
todos:
  - id: ap4-api
    content: POST /api/publish source+text+target+sanitize
    status: pending
  - id: ap4-ui
    content: Отправить выбранное с превью; plan summary optional
    status: pending
  - id: ap4-tests
    content: Unit sanitize + 401; smoke TG
    status: pending
isProject: false
---

# AP4 — Selective publish → TG

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)
**Зависимость:** после AP2a; сильнее с AP3.

## Сверка с rules

**Обязательны:** `mgmt-tg-notify`, `безопасность-ролей-и-данных`, `ui-web-практики`, `go-testing`.
**Вне scope:** auto-publish без превью.

## DoD

- [ ] Выбранный текст в TG
- [ ] Tech-leak strip
- [ ] React без vanilla
