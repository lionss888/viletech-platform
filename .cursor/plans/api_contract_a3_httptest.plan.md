---
name: API contract A3 httptest
overview: "Подключить schema assert к httptest create→get→action на 4 path’ах. Без docs и без полного ci-pr-fast."
todos:
  - id: contract-test
    content: "Тест рядом со smoke_test: POST create, GET by id, POST action — Validate Form body"
    status: pending
  - id: health-assert
    content: "Минимальный assert health 200 + shape из yaml"
    status: pending
  - id: core-go-test
    content: "cd vdp/core && go test ./internal/transport/http/... зелёный"
    status: pending
isProject: false
---

# A3 — httptest schema assert

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)  
Depends on: [api_contract_a2_schema_helper.plan.md](api_contract_a2_schema_helper.plan.md)

## Цель

Реальные ответы core HTTP на критичных path’ах проходят schema validate.

## Path’ы

| Path | Assert |
|---|---|
| GET /api/v1/health | ok-shape |
| POST /api/v1/forms | Form |
| GET /api/v1/forms/{id} | Form |
| POST /api/v1/forms/{id}/actions/{action} | Form |

Опираться на стек [`smoke_test.go`](vdp/core/internal/transport/http/smoke_test.go).

## Вне scope

Docs, `ci-pr-fast` целиком, FE, golden (Stage B)

## DoD

- Новый/расширенный тест краснеет при намеренно битом моке (если есть) или зелёный на live httptest
- `go test` http-пакета core зелёный

## Rules

`тесты-архитектуры`, `vdp-ci-local-gate` (частично). Полный gate Stage A — A4.
