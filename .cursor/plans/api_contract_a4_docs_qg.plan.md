---
name: API contract A4 docs QG
overview: "Закрытие Stage A: docs/api/openapi.md + check-env-parity + ci-pr-fast. Без Stage B."
todos:
  - id: docs-a
    content: "openapi.md: Stage A live (4 path’а + helper); B/C/Pact later"
    status: pending
  - id: docs-format
    content: "make docs-format-check"
    status: pending
  - id: env-parity
    content: "make check-env-parity"
    status: pending
  - id: ci-pr-fast
    content: "make ci-pr-fast зелёный; зафиксировать DoD Stage A"
    status: pending
isProject: false
---

# A4 — docs + QG Stage A

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)  
Depends on: [api_contract_a3_httptest.plan.md](api_contract_a3_httptest.plan.md)

## Цель

Честно закрыть Stage A: документация + полный заявленный gate без Playwright-обязательства сверх `ci-pr-fast`.

## Scope

- [`vdp/docs/api/openapi.md`](vdp/docs/api/openapi.md)
- `make check-env-parity`
- `make docs-format-check`
- `make ci-pr-fast`

## Вне scope

Golden, Vitest Stage B, codegen, Pact

## DoD

- Docs описывают исполняемый контракт A, не обещают B как done
- `ci-pr-fast` зелёный
- Критерий пользы A: удаление required поля из ответа create ломает go-test-core

## Rules

`честность-готовности`, `vdp-ci-local-gate`, `планирование-сверка-с-rules`. После A4 можно стартовать B1.
