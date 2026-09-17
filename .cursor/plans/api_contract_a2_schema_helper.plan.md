---
name: API contract A2 helper
overview: "Go helper в shared: загрузка Form-схемы из forms.yaml и validate JSON. Unit valid/invalid. Без httptest wire."
todos:
  - id: package-openapi
    content: "Пакет vdp/shared/openapi (или аналог): Load + ValidateNamedSchema"
    status: pending
  - id: unit-valid-invalid
    content: "Unit: валидный Form JSON ok; без status — ошибка"
    status: pending
  - id: go-mod-dep
    content: "Минимальная зависимость jsonschema/yaml при необходимости; go test ./... в shared"
    status: pending
isProject: false
---

# A2 — schema validate helper

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)  
Depends on: [api_contract_a1_forms_yaml.plan.md](api_contract_a1_forms_yaml.plan.md)

## Цель

Исполняемый validate: JSON document ⊆ схема `Form` из yaml.

## Scope

- Новый код под `vdp/shared/` рядом с openapi
- Unit: happy + missing required field
- Зависимости — минимальные

## Вне scope

httptest к core HTTP, Vitest, правки yaml кроме мелкого фикса если helper требует (предпочтительно не трогать — A1 закрыт)

## DoD

- `cd vdp/shared && go test ./...` зелёный
- кейс без `status` красный в unit

## Rules

`тесты-архитектуры`, `правила-построения`, `честность-готовности`. Gate: shared go test; `ci-pr-fast` — на A4.
