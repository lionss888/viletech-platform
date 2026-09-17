---
name: Vedy P5 alpha stand tests
overview: "P5: запуск и статус проверок стенда alpha (и родственных) из vedy_bot console/operator — без публичного uncontrolled trigger менеджеру."
todos:
  - id: p5-1-contract
    content: "P5.1 Контракт команд stand: alpha smoke / ci-pr-fast / notify"
    status: pending
  - id: p5-2-runner
    content: "P5.2 Adapter: invoke vdp make targets / GH workflow dispatch"
    status: pending
  - id: p5-3-api-ui
    content: "P5.3 API + console UI start/status job"
    status: pending
  - id: p5-4-tg-ops
    content: "P5.4 Operator TG commands; manager only sanitized status"
    status: pending
  - id: p5-5-gate
    content: "P5.5 Unit adapter mocks + vdp check-env-parity + ci-pr-fast if scripts touched"
    status: pending
isProject: false
---

# P5 — Тесты стендов (alpha) из бота

Родитель: [vedy_bot_master_knowledge_agent.plan.md](vedy_bot_master_knowledge_agent.plan.md). Зависит: **P0** (бот жив). Может идти ∥ P1–P2.

**Решение (утверждено):** старт тестов — только operator console / operator TG; менеджеру — лишь sanitized статус (не start).

## Цель

Оператор из console (и/или operator TG) запускает проверку alpha / смотрит статус; менеджеру — только безопасный статус (sanitize), без произвольного remote exec.

## Сверка rules

**Обязательны:** `vdp-ci-local-gate`, `развертывание-и-доставка`, `тесты-архитектуры`, `честность-готовности`, `безопасность-ролей-и-данных`, `mgmt-tg-notify` (promote/gate kinds), `go-testing`.

**Вне scope:** полный release-gate по умолчанию; менеджер без ограничений запускает деплой.

**QG:**  
- vedy_bot: `make test`  
- если правим `vdp/scripts/**`: `make check-env-parity` → `make ci-pr-fast` (минимум)  
- ручной: console «stand alpha status/start» на dry-run или реальном alpha по согласованию

## Слои

| Слой | Содержание |
|---|---|
| UI | Stand panel: env, action, last status |
| FE | Jobs list |
| Домен | StandJob record |
| API | `/api/stand/start`, `/api/stand/status` |
| Unit | adapter mocks |
| E2E | dry-run job |
| Compose | allowlist commands |
| Docs | who may trigger |

## Декомпозиция

### P5.1 Контракт

Allowlist действий (не shell произвольный):

- `alpha-status` — health/uptime notify probe  
- `alpha-smoke` — документированный staging-smoke / аналог  
- `gate-fast` — `make ci-pr-fast` (локально/CI dispatch)  
- `notify-gate` — `notify-mgmt.sh --kind gate`

Подэтап P5.1.1: таблица действие → команда → секреты → аудитория (ops vs manager).

### P5.2 Adapter

- Порт `StandRunner` в vedy_bot.
- Реализации: local `exec` allowlist в workspace `vdp/`; optional GitHub `workflow_dispatch`.
- Job store: status queued/running/done/error, log path redacted.

### P5.3 API + UI

- Bearer console only для start.
- Status poll.
- FE: кнопки allowlist + last result.

### P5.4 TG

- Operator chat: `/stand alpha status`, `/stand alpha smoke`.
- Manager chat: только исходящий sanitized status (по явному publish), **не** start от менеджера в default policy.

### P5.5 Gate

- Unit: unknown action rejected; allowlist ok.
- Touch vdp scripts → `ci-pr-fast`.
- Manual dry-run.

## DoD

- [ ] Allowlist stand actions из console
- [ ] Manager не может стартовать произвольный exec
- [ ] Статус менеджеру sanitized
- [ ] Jobs с error/done честно
- [ ] QG: vedy_bot test + vdp gate если затронут vdp
