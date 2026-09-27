---
name: AP1 Analytics boundary
overview: Единый DTO анализа на границе pipeline→card/planfile/API; in-process пакет, не отдельный сервис.
todos:
  - id: ap1-dto
    content: Публичный Result/Bundle DTO class+confidence+summary+conflicts+estimate
    status: completed
  - id: ap1-wire
    content: Pipeline пишет один контракт; API отдаёт метаданные
    status: completed
  - id: ap1-tests
    content: Table-driven unit на маппинг; README analytics=in-process
    status: completed
isProject: false
---

# AP1 — Analytics boundary

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)

## Сверка с rules

**Обязательны:** `границы-и-контексты`, `screaming-architecture`, `go-testing`, `честность-готовности`.
**Вне scope:** docker-сервис analytics; Ollama; ML.

## Цель

Явный пакетный контракт анализа для консоли и planfile.

## DoD

- [x] Один DTO на границе
- [x] Unit маппинга
- [x] README: analytics = in-process
