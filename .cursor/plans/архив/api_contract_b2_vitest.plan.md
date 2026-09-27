---
name: API contract B2 vitest
overview: "Vitest читает shared golden и проверяет обязательные ключи / совместимость с CoreForm. Без полного ci-pr-fast."
todos:
  - id: fe-read-golden
    content: "Тест в fe: загрузка golden (path/copy-contract как принято в репо)"
    status: pending
  - id: assert-coreform-keys
    content: "Assert required keys совпадают с CoreForm; mapper не падает на golden"
    status: pending
  - id: fe-npm-test
    content: "cd vdp/fe && npm test зелёный на новом тесте"
    status: pending
isProject: false
---

# B2 — Vitest ↔ golden

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)  
Depends on: [api_contract_b1_golden.plan.md](api_contract_b1_golden.plan.md)

## Цель

FE unit краснеет, если golden потерял поле, нужное [`CoreForm`](vdp/fe/src/lib/api/forms.ts).

## Scope

- Новый `*.test.ts` под `vdp/fe/src/lib/api/`
- Чтение golden без codegen
- Без правок Playwright

## Вне scope

docs/QG Stage B (B3), OpenAPI codegen

## DoD

- `npm test` зелёный
- удаление required ключа из golden → красный Vitest (или согласованный fail path)

## Rules

`тесты-архитектуры`, `typescript-clean-code` (типы явные). Не трогать `fe-interaction-contracts`.
