---
name: AP2b Operator TG
overview: "TELEGRAM_OPERATOR_CHAT_IDS + router manager vs operator; консоль — зеркало."
todos:
  - id: ap2b-config
    content: Env TELEGRAM_OPERATOR_CHAT_IDS + config load test
    status: pending
  - id: ap2b-router
    content: HITL reminders/agent digests → operator; ack → manager
    status: pending
  - id: ap2b-thread
    content: Thread channel tag + console filter
    status: pending
isProject: false
---

# AP2b — Operator Telegram channel

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)
**Зависимость:** после AP2a.

## Сверка с rules

**Обязательны:** `границы-и-контексты`, `безопасность-ролей-и-данных`, `mgmt-tg-notify`, `go-testing`.
**Вне scope:** webhook; смена HITL-политики менеджера.

## DoD

- [ ] Два чата в env
- [ ] Unit router
- [ ] Honesty: консоль = зеркало
