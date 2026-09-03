---
name: IN0 intake transport
overview: "Первая исполняемая волна: Go-модуль поток вводных — long poll, /vvod и /help, redact, jsonl вне git, reply-ack, Docker в модуле, GitLab job. Без vdp/hub."
todos:
  - id: in0-module
    content: go.mod github.com/viletech/tools/intake, cmd/intake (--once и цикл), config ~/.vdp-intake/env
    status: pending
  - id: in0-pipeline
    content: "getUpdates: CHAT_IDS список, /vvod+/help, dedupe update_id, redact, jsonl, reply принято"
    status: pending
  - id: in0-docker
    content: Dockerfile + compose в модуле; volume ~/.vdp-intake; токен не в образе
    status: pending
  - id: in0-ci
    content: go test ./... и job intake в .gitlab-ci.yml на путь модуля
    status: pending
  - id: in0-botfather
    content: Отдать список команд и шаги BotFather /setcommands
    status: pending
isProject: false
---

# IN0 — Intake transport

## Meta

- **ID:** IN0 · **Группа:** Поток вводных · **Зависимости:** нет · **Оценка:** ~0.5–1 дня
- **Entry:** отдельный бот `@vdp_intake_bot`, чат `-5437125886`
- **Master:** программа «чат → jsonl → волна 2–3 дня»

## Scope

**In:** модуль [`инструменты/поток-вводных/`](инструменты/поток-вводных/), long poll `getUpdates`, filter списка `TELEGRAM_INTAKE_CHAT_IDS` (сейчас одно значение), любой участник чата, команды `/vvod` и `/help`, идемпотентность `update_id`, redact ПДн, append `~/.vdp-intake/inbox/YYYY-MM-DD.jsonl`, reply «принято» без эха, `--once` и демон, Docker Compose **в модуле**, job GitLab, инструкция BotFather в ответе агента.

**Out:** soft/hard parse 6 полей, классификация, WSJF, вопрос бота в чат (IN2), draft product-plan, `vdp/hub`, `vdp/docker-compose.yml`, webhook, `vdp_notify_bot`, refresh FE Docker, README.

## Rules gate

Обязательны: `границы-и-контексты`, `детали-как-плагины`, `screaming-architecture`, `безопасность-ролей-и-данных`, `интеграция-и-события` (идемпотентность), `устойчивость-и-наблюдаемость` (timeout/backoff), `развертывание-и-доставка` (секрет снаружи, один процесс на контейнер), `go-architecture`, `go-testing`, `go-resilience-security`, `тесты-архитектуры`, `правила-построения`, `честность-готовности`, Doherty (`ux-взаимодействие-и-скорость`) для ack.

Вне scope IN0: nestjs, playwright, use-cases продукта, ML как истина статуса.

Gate: unit на parse/dedupe/redact/ack; токен не в git; hub не трогать; не утверждать «пайплайн готов».

## Работы

1. `go.mod` `github.com/viletech/tools/intake` (Go 1.22 как CI).
2. Слои: `internal/telegram` (timeout HTTP), `normalize`, `redact`, `store`, `config`.
3. `/help` — reply с шаблоном 6 полей, **не** строка backlog в jsonl.
4. Compose+Dockerfile: `INTAKE_HOME=/var/lib/vdp-intake`, mount `~/.vdp-intake`.
5. [`.gitlab-ci.yml`](.gitlab-ci.yml): отдельный job `intake` (не раздувать `fast` с fe+vdp), `changes` на `инструменты/поток-вводных/**`.
6. После merge кода — текст для BotFather: `vvod`, `help`.

Jsonl `/vvod`: `update_id`, `message_id`, `chat_id`, `from_id`, `from_username`, `command`, `text` (redact), `received_at`.

## DoD

- [ ] `go test ./...` зелёный (table-driven)
- [ ] `--once` и цикл собираются
- [ ] Docker стартует без токена в образе
- [ ] GitLab job на путь модуля
- [ ] Ручной `/vvod` → jsonl + reply; `/help` → шаблон
- [ ] Список команд отдан вам
- [ ] Честно: транспорт+ops скелета; интерпретация 0%

## Status

pending · код модуля отсутствует
