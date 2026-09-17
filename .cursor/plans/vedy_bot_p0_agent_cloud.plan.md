---
name: Vedy P0 agent cloud
overview: "P0: восстановить cloud Cursor из консоли; analyze→SDK; честный error; ops env. HITL rules не трогаем."
todos:
  - id: p0-1-env
    content: "P0.1 Канон ~/.vedy_bot/env + CURSOR_API_KEY + migrate legacy"
    status: pending
  - id: p0-2-up
    content: "P0.2 make up / health / status agent configured"
    status: pending
  - id: p0-3-bridge-host
    content: "P0.3 Makefile bridge-npm-install для host go run"
    status: pending
  - id: p0-4-runner
    content: "P0.4 runner: все modes→Cursor; error≠done; local_analyze явный"
    status: pending
  - id: p0-5-ui
    content: "P0.5 Console UI показывает job.error"
    status: pending
  - id: p0-6-gate
    content: "P0.6 Unit + make test + make smoke + ручной ask_agent"
    status: pending
isProject: false
---

# P0 — Cloud Cursor agent (консоль), честность

Родитель: [vedy_bot_master_knowledge_agent.plan.md](vedy_bot_master_knowledge_agent.plan.md). Было: [агент_реальная_обработка_7ba8fe94.plan.md](агент_реальная_обработка_7ba8fe94.plan.md).

## Цель

Сквозной путь: консоль → `POST /api/agent` → `agent-bridge/ask.mjs` → Cursor **cloud** → ответ в thread. Без маскировки stub’ом.

## Сверка rules

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `правила-построения`, `go-testing`, `поддержка-и-обратная-связь`.

**Вне scope P0:** TG→SDK (P2), KB (P1), local agent (P4), alpha (P5), смена HITL (P3).

**QG:** `cd инструменты/vedy_bot && make test && make smoke`; ручной ask_agent с ключом.

## Слои

| Слой | Содержание |
|---|---|
| UI | Error state agent panel |
| FE | fe + embed app.js |
| Домен | Cards/HITL без изменений |
| API | job.status=`error` |
| Unit | runner table-driven |
| E2E | smoke + manual |
| Compose | env + make up |
| Docs | README Honesty gaps |

## Декомпозиция

### P0.1 Env

- Создать `~/.vedy_bot/env` из `~/.vdp-intake/env` если нужно.
- Поля: `TELEGRAM_INTAKE_TOKEN`, `TELEGRAM_INTAKE_CHAT_IDS`, `TELEGRAM_OPERATOR_CHAT_IDS`, `INTAKE_CONSOLE_TOKEN`, `CURSOR_API_KEY`, `INTAKE_AGENT_CLOUD=1`.
- chmod 600.

### P0.2 Runtime up

- `make up` из `инструменты/vedy_bot`.
- `GET /health`, `GET /api/status` (Bearer).
- Лог: hitl/analyze/workspace/agent bridge path.

### P0.3 Host bridge

- Цель Makefile `bridge-npm-install`.
- Документировать host-run: `INTAKE_AGENT_BRIDGE`, node_modules обязательны.

### P0.4 Runner ([internal/agent/runner.go](инструменты/vedy_bot/internal/agent/runner.go))

- `analyze_selected` / `analyze_chat` / `ask_agent` → `runCursorAgent`.
- Нет ключа → `status=error`.
- SDK fail → `status=error`, не `done`+stub.
- Mode `local_analyze` — явный stub для unit/offline.

### P0.5 UI

- Показ `job.Error` в SPA и embed.
- Не рендерить stub как success.

### P0.6 Gate

- Unit: no key / analyze→cursor path / fail→error / local_analyze.
- `make test`, `make smoke`.
- Manual: ask_agent → cloud text in thread.

## DoD

- [ ] Бот жив, console 200 с token
- [ ] ask_agent / analyze с ключом → Cursor, не «Локальный разбор»
- [ ] Без ключа / SDK fail → error виден
- [ ] HITL rules по-прежнему работают
- [ ] `make test` + `make smoke` зелёные
