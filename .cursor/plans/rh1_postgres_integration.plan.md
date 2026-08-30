---
name: RH1 Postgres Integration
overview: "Build tag integration, make test-integration, расширение Postgres-тестов core/hub, CI postgres service. Снижает риск memory green / postgres broken."
todos:
  - id: rh1-build-tag
    content: "//go:build integration для *_integration_test.go; make test-integration"
    status: pending
  - id: rh1-core-tests
    content: Расширить store_integration + outbox postgres round-trip (core)
    status: pending
  - id: rh1-hub-tests
    content: Расширить inbox postgres idempotency (hub)
    status: pending
  - id: rh1-ci-step
    content: Postgres service container в CI job integration (до compose-e2e)
    status: pending
  - id: rh1-docs
    content: Раздел memory vs postgres vs compose в testing.md
    status: pending
  - id: rh1-gate
    content: "DoD: ≥5 integration tests green в CI без skip"
    status: pending
isProject: false
---

# RH1 — Postgres Integration Test Layer

## Meta

- **ID:** RH1 · **Группа:** Backend tests · **Зависимости:** RH0 (CI job для integration) · **Оценка:** 2–3 дня
- **Known-gaps:** «Postgres test coverage» — [`vdp/docs/pilot/known-gaps.md`](../../vdp/docs/pilot/known-gaps.md)
- **Master:** [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md)

## Scope

**In:**

- Build tag `integration` для Go-тестов с реальным Postgres
- Makefile target `test-integration`
- Расширение существующих integration-файлов + новый outbox postgres test
- CI: postgres service в job `integration` **до** compose-e2e (быстрый SQL-сигнал)
- Документация слоёв: memory / postgres / compose

**Out:**

- Переписывание всех HTTP-тестов на postgres (memory остаётся для скорости unit)
- Load/stress testing
- Shared DB между core и hub

## Rules gate

**Обязательны:**

- [`go-testing`](../.cursor/rules/go-testing.mdc) — table-driven, parallel, mock ports
- [`go-architecture`](../.cursor/rules/go-architecture.mdc) — repository as detail
- [`тесты-архитектуры`](../.cursor/rules/тесты-архитектуры.mdc) — unit fast, integration selective
- [`границы-и-контексты`](../.cursor/rules/границы-и-контексты.mdc) — core DB ≠ hub DB
- [`правила-построения`](../.cursor/rules/правила-построения.mdc)
- [`развертывание-и-доставка`](../.cursor/rules/развертывание-и-доставка.mdc) — CI postgres service

**Вне scope:** ORM migration rollback tests; multi-region postgres.

## Prerequisites

- [x] `make test` green (memory)
- [x] [`r0_gate_test.go`](../../vdp/core/internal/transport/http/r0_gate_test.go) — compose defaults postgres
- [ ] RH0 CI job `integration` exists (or local postgres for dev)

## Работы

### 1. Build tag convention

```go
//go:build integration

package postgres_test
```

Файлы:

- [`vdp/core/internal/repository/postgres/store_integration_test.go`](../../vdp/core/internal/repository/postgres/store_integration_test.go)
- [`vdp/hub/internal/inbox/postgres_integration_test.go`](../../vdp/hub/internal/inbox/postgres_integration_test.go)
- Новый: `vdp/core/internal/outbox/postgres_integration_test.go`

`make test` — **без** tag (быстро, memory only).
`make test-integration` — `go test -tags=integration ./...` с env:

```sh
DATABASE_URL_CORE=postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable
DATABASE_URL_HUB=postgres://vdp_hub:vdp_hub@localhost:5432/vdp_hub?sslmode=disable
```

Skip с понятным сообщением если postgres unavailable (local dev без БД).

### 2. Расширить core store integration

- Persist form + transition status via postgres store
- Refund constraint или cancel invariant (409 path data layer)
- Outbox enqueue + flush marker (без full HTTP stack)

### 3. Расширить hub inbox integration

- Duplicate delivery → idempotent write (at-least-once)
- Correlation / form_payment_id in payload

### 4. Makefile

```makefile
test-integration:
	cd $(CORE_DIR) && go test -tags=integration ./...
	cd $(HUB_DIR) && go test -tags=integration ./...
```

### 5. CI (RH0 workflow)

В job `integration`, step **before** compose-up:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: vdp
      POSTGRES_PASSWORD: vdp
    ports:
      - 5432:5432
```

Run migrations or use test schema bootstrap; then `make test-integration`.

### 6. Документация

[`vdp/docs/development/testing.md`](../../vdp/docs/development/testing.md) — секция:

- Layer 1: unit memory (`make test`)
- Layer 2: integration postgres (`make test-integration`)
- Layer 3: compose e2e (`make compose-e2e`)

## Verify

```sh
cd vdp && make db-setup   # local
cd vdp && make test-integration
cd vdp && make test       # still fast, no integration tag
```

CI: integration job shows ≥5 tests passed, 0 skipped (when service up).

## DoD

- [ ] `make test-integration` target in Makefile
- [ ] ≥5 integration tests pass in CI without skip
- [ ] `make test` unchanged speed (no integration tag by default)
- [ ] testing.md documents three layers
- [ ] Gate test r0_gate still requires compose postgres default

## Honesty note

HTTP gate tests ([`smoke_test.go`](../../vdp/core/internal/transport/http/smoke_test.go) `newStack()`) **остаются memory** — это осознанно (скорость). Postgres покрывает persistence layer; compose-e2e — full stack.

## Якоря

- [`vdp/core/internal/repository/memory.go`](../../vdp/core/internal/repository/memory.go) — MemoryStore comment
- [`vdp/docker-compose.yml`](../../vdp/docker-compose.yml) — STORE_DRIVER=postgres comment
