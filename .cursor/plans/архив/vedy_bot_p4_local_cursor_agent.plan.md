---
name: Vedy P4 local Cursor agent
overview: "P4: dual-mode Cursor Agent — cloud (default) и local (INTAKE_AGENT_CLOUD=0) с честной деградацией при нехватке ресурсов."
todos:
  - id: p4-1-config
    content: "P4.1 Конфиг cloud|local|auto + probe resources"
    status: pending
  - id: p4-2-bridge
    content: "P4.2 ask.mjs local cwd path + error mapping"
    status: pending
  - id: p4-3-console
    content: "P4.3 UI переключатель runtime + статус"
    status: pending
  - id: p4-4-fallback
    content: "P4.4 Local fail → optional cloud retry или error"
    status: pending
  - id: p4-5-gate
    content: "P4.5 Unit env wiring + manual local when machine allows"
    status: pending
isProject: false
---

# P4 — Local Cursor Agent (dual-mode)

Родитель: [vedy_bot_master_knowledge_agent.plan.md](vedy_bot_master_knowledge_agent.plan.md). Зависит: **P0**.

## Цель

Поддержать `INTAKE_AGENT_CLOUD=0` (local cwd workspace) наряду с cloud=1. Не блокировать менеджерский контур: при нехватке ресурсов — явный error или retry cloud по политике.

## Сверка rules

**Обязательны:** `честность-готовности`, `устойчивость-и-наблюдаемость`, `go-testing`, `детали-как-плагины`.

**Вне scope:** гарантия local на слабой машине; Ollama.

**QG:** `make test`; manual cloud path всегда; local — если машина тянет, иначе документированный skip с error honesty.

## Слои

| Слой | Содержание |
|---|---|
| UI | Toggle cloud/local |
| FE | status.agent_runtime |
| Домен | — |
| API | status + agent start respects mode |
| Unit | env propagation tests |
| E2E | manual |
| Compose | default cloud=1 |
| Docs | when local fails |

## Декомпозиция

### P4.1 Config

- `INTAKE_AGENT_CLOUD=1|0`, optional `INTAKE_AGENT_RUNTIME=cloud|local|auto`.
- Auto: try local, on resource fail → cloud if key allows.

### P4.2 Bridge

- Уже есть branch в ask.mjs; усилить ошибки (OOM/timeout) → понятный stderr.
- Workspace mount в Docker для local mode (сейчас `/workspace`).

### P4.3 Console

- Переключатель + индикатор текущего runtime.
- Не путать с console Bearer.

### P4.4 Fallback policy

- `INTAKE_AGENT_LOCAL_FALLBACK_CLOUD=1` (default on for operator console; off for cost control if needed).

### P4.5 Gate

- Unit: env passed to bridge.
- Manual matrix: cloud ok; local ok|honest fail.

## DoD

- [ ] Cloud и local переключаются конфигом
- [ ] Local fail не выглядит как успешный localAnalyze
- [ ] Default остаётся cloud
- [ ] `make test` зелёный
