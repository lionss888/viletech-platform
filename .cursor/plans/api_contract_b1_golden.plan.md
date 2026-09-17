---
name: API contract B1 golden
overview: "Один shared golden Form JSON + проверка схемой Form. Без Vitest и без ci-pr-fast Stage B."
todos:
  - id: write-golden
    content: "Добавить form.golden.json под shared/openapi/testdata (или согласованный path)"
    status: pending
  - id: golden-schema-unit
    content: "Go unit: golden проходит Validate Form; битая копия — нет"
    status: pending
isProject: false
---

# B1 — shared golden Form

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)  
Depends on: Stage A закрыт ([api_contract_a4_docs_qg.plan.md](api_contract_a4_docs_qg.plan.md))

## Цель

Одна каноническая фикстура Form JSON как стык для Go и (далее) FE.

## Scope

- Файл golden рядом с openapi
- Unit в shared: schema validate

## Вне scope

Vitest (B2), docs/QG Stage B (B3)

## DoD

- golden ⊆ Form schema
- `cd vdp/shared && go test` зелёный

## Rules

`тесты-архитектуры`, `интеграция-и-события`.
