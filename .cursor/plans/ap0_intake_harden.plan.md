---
name: AP0 Intake harden
overview: "Матрица триггер→HITL/thread, unit на media-only, README honesty. Модуль инструменты/поток-вводных."
todos:
  - id: ap0-matrix
    content: Зафиксировать матрицу триггер→inbox/HITL vs thread-only + /help copy
    status: pending
  - id: ap0-tests
    content: Unit classify + media-only path; make test green
    status: pending
  - id: ap0-readme
    content: README honesty совпадает с поведением
    status: pending
isProject: false
---

# AP0 — Harden intake (общий чат)

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)

## Сверка с rules

**Обязательны:** `правила-построения`, `честность-готовности`, `go-testing`, `интеграция-и-события`, `workspace-карта`.
**Вне scope:** история до poller; stickers/voice; webhook.

## Цель

Стабильный вход менеджера без ложных обещаний: явная матрица `@bot`/`/vvod` → HITL vs thread-only.

## DoD

- [ ] Unit на classify + media без триггера
- [ ] README honesty
- [ ] `make test` зелёный
