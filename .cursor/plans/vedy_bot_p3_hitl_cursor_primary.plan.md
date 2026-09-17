---
name: Vedy P3 HITL Cursor primary
overview: "P3: rule-based HITL становится secondary; primary путь intake = Cursor+knowledge; hybrid fallback; без hard-delete кода rules до стабилизации."
todos:
  - id: p3-1-modes
    content: "P3.1 INTAKE_HITL_MODE=cursor|rules|hybrid + defaults"
    status: pending
  - id: p3-2-cutover
    content: "P3.2 Default hybrid→cursor; rules only on SDK/KB fail"
    status: pending
  - id: p3-3-parity
    content: "P3.3 Паритет исходов: clarify/proposal/approve/reminders"
    status: pending
  - id: p3-4-metrics
    content: "P3.4 Experience ledger: mode, fallback reason"
    status: pending
  - id: p3-5-deprecate
    content: "P3.5 Docs: rules deprecated as primary; code retained"
    status: pending
  - id: p3-6-gate
    content: "P3.6 Unit mode matrix + manual dual-path"
    status: pending
isProject: false
---

# P3 — Замена primary: rule-HITL → Cursor+KB

Родитель: [vedy_bot_master_knowledge_agent.plan.md](vedy_bot_master_knowledge_agent.plan.md). Зависит: **P2**.

**Решение (утверждено):** hybrid/fallback — rules **не** hard-delete; primary = Cursor+KB.

## Цель

«Реальная обработка» — default для менеджерского intake. Rule-based analyze/proposal — **fallback**, не удаление в этой волне (hard-delete — отдельный мини-этап после N дней стабильности).

## Сверка rules

**Обязательны:** `use-cases`, `честность-готовности`, `правила-построения`, `go-testing`, `поддержка-и-обратная-связь`, `безопасность-ролей-и-данных`.

**Вне scope:** удаление пакетов `analyze`/`conflict`/`estimate` из репо; alpha; local agent.

**QG:** `make test`; matrix mode cursor/rules/hybrid; manual TG default cursor path.

## Слои

| Слой | Содержание |
|---|---|
| UI | Badge режима HITL в console status |
| FE | status API field `hitl_mode` |
| Домен | Единые card statuses |
| API | config echo |
| Unit | mode switch + fallback |
| E2E | manual |
| Compose | env HITL_MODE |
| Docs | Trigger matrix + honesty |

## Декомпозиция

### P3.1 Режимы

- `INTAKE_HITL_MODE=rules|cursor|hybrid`.
- Документировать семантику каждого.

### P3.2 Cutover

- После P2 DoD: default `hybrid` на неделю калибровки → `cursor`.
- Fallback triggers: no key, SDK error, empty/unparseable agent, KB pack required-and-missing.

### P3.3 Паритет исходов

- Те же manager templates (Clarify/Proposal/Approve/Decline/Reminder/Stale).
- Approve/decline parsing без изменений.
- Plan file parity Cursor-grade.

### P3.4 Observability

- experience Event: `mode`, `fallback_reason`.
- Логи structured без ПДн.

### P3.5 Deprecate docs

- README: rules = offline/fallback.
- Не claim «rules removed».

### P3.6 Gate

- Unit: hybrid falls back on injected agent error.
- Manual: cursor path + forced fallback.

## DoD

- [ ] Default mode после cutover = cursor (или hybrid по согласованию)
- [ ] Fallback rules работает и логируется
- [ ] Manager journey паритетен
- [ ] Код rules сохранён
- [ ] `make test` зелёный
