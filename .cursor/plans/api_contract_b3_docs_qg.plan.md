---
name: API contract B3 docs QG
overview: "Закрытие Stage B: docs + check-env-parity + ci-pr-fast. Master index отметить B done."
todos:
  - id: docs-b
    content: "openapi.md: Stage B golden + Vitest; C/Pact still later"
    status: pending
  - id: master-status
    content: "Обновить todos в lean master / статусы дочерних планов"
    status: pending
  - id: env-parity
    content: "make check-env-parity"
    status: pending
  - id: ci-pr-fast
    content: "make ci-pr-fast зелёный — закрытие lean A+B пути"
    status: pending
isProject: false
---

# B3 — docs + QG Stage B

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)  
Depends on: [api_contract_b2_vitest.plan.md](api_contract_b2_vitest.plan.md)

## Цель

Честно закрыть Stage B и весь lean near-term путь A→B.

## Scope

- Docs
- `check-env-parity`
- `ci-pr-fast` (включает fe-npm-test + go-test-core)

## Вне scope

Step C, Pact, Karate, `ci-pr-pilot`

## DoD

- Docs не заявляют codegen/Pact как done
- `ci-pr-fast` зелёный
- Master index: все run-a* / run-b* completed

## Rules

`честность-готовности`, `vdp-ci-local-gate`, `mgmt-tg-notify` вне scope (не продуктовый done для менеджмента).
