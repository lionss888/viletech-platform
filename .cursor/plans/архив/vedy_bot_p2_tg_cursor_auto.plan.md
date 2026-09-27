---
name: Vedy P2 TG Cursor auto
overview: "P2: intake из Telegram → Cursor SDK с ContextPack из knowledge; вопросы менеджеру или принятие в работу с plan.md."
todos:
  - id: p2-1-policy
    content: "P2.1 Политика: когда auto-SDK vs только HITL queue"
    status: pending
  - id: p2-2-pipeline
    content: "P2.2 Pipeline hook after intake → agent job + pack"
    status: pending
  - id: p2-3-manager-out
    content: "P2.3 Парсинг ответа агента → Clarify/Proposal sanitize → TG"
    status: pending
  - id: p2-4-plan
    content: "P2.4 Accept path: estimate + WriteMarkdown plan Cursor-grade"
    status: pending
  - id: p2-5-ops-guard
    content: "P2.5 Таймауты, queue, cost guard, operator mirror"
    status: pending
  - id: p2-6-gate
    content: "P2.6 Unit pipeline + manual TG journey"
    status: pending
isProject: false
---

# P2 — Автозапуск Cursor из TG (intake → SDK)

Родитель: [vedy_bot_master_knowledge_agent.plan.md](vedy_bot_master_knowledge_agent.plan.md). Зависит: **P0**, **P1**.

## Цель

Менеджер пишет `@бот` / `/vvod` → система (Cursor + knowledge) понимает запрос → либо вопросы менеджеру, либо «принято в работу» = анализ/оценка + `.plan.md`. Консоль не обязательна на happy path.

## Сверка rules

**Обязательны:** `use-cases`, `интеграция-и-события`, `честность-готовности`, `безопасность-ролей-и-данных`, `устойчивость-и-наблюдаемость` (timeout/retry), `поддержка-и-обратная-связь`, `go-testing`, `mgmt-tg-notify` только для done-шаблонов если шлём менеджменту.

**Вне scope:** замена rule default (P3), alpha (P5), local agent (P4).

**QG:** `make test`; manual TG intake → clarify или proposal+plan file; при SDK down — явный статус менеджеру без fake done.

## Слои

| Слой | Содержание |
|---|---|
| UI | Опционально: индикатор «агент обрабатывает» в console |
| FE | Статус card `awaiting_agent` |
| Домен | Card statuses + agent job link |
| API | Уже agent; плюс card.agent_job_id |
| Unit | pipeline auto-path, sanitize out |
| E2E | Manual TG; optional smoke stub messenger |
| Compose | CURSOR key required for auto path |
| Docs | Trigger matrix update |

## Декомпозиция

### P2.1 Политика

- Флаг `INTAKE_TG_CURSOR=1`.
- Условия auto: trigger intake + cloud key present.
- Если key нет / SDK error → message менеджеру «принято, разберём вручную» + card для оператора (не silent).

### P2.2 Pipeline hook

- После inbox append: build ContextPack (P1) + prompt template (intent, questions OR accept).
- Start agent job async; card status `awaiting_agent`.
- Idempotency: один job на root message_id.

### P2.3 Manager-facing out

- Structured agent output (JSON или маркеры): `clarify` | `proposal` | `conflict`.
- Map → `comms.Clarify` / `Proposal` / `ConflictWarn` + SanitizeManager.
- Не слать сырой IDE/path текст в manager chat.

### P2.4 Accept → plan

- При proposal/accept path: estimate (reuse/heuristic или agent hours) + `planfile.WriteMarkdown` Cursor-grade todos.
- Card → `awaiting_approve` (менеджер да/нет) **или** auto-approve только по явному флагу (default: всё ещё HITL approve).

### P2.5 Guards

- Timeout (уже ~8m agent): менеджеру soft notice.
- Max concurrent TG agent jobs.
- Operator chat mirror tech errors (sanitized lightly for ops).

### P2.6 Gate

- Unit: mock agent → clarify text sanitized; plan file written on accept path.
- Manual: real TG message → Cursor → TG reply.
- Fail path: kill bridge → менеджер видит честный ack, card open.

## DoD

- [ ] TG intake при флаге запускает Cursor без консоли
- [ ] ContextPack из knowledge участвует в промпте
- [ ] Исход: вопросы или proposal+plan.md
- [ ] Manager text sanitized
- [ ] SDK fail не маскируется «успешной обработкой»
- [ ] `make test` зелёный
