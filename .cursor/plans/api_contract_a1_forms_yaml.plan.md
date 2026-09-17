---
name: API contract A1 yaml
overview: "Только расширение forms.yaml: components/schemas/Form и responses на 4 path’а. Без Go helper и без httptest."
todos:
  - id: schema-form
    content: "Добавить components/schemas/Form (+ Rate/Commission при необходимости) с required под CoreForm"
    status: pending
  - id: path-responses
    content: "Привязать responses к health, POST /forms, GET /forms/{id}, POST .../actions/{action}"
    status: pending
  - id: yaml-lint-sanity
    content: "Проверить yaml валиден (parse); не трогать CI-скрипты в этом плане"
    status: pending
isProject: false
---

# A1 — forms.yaml schemas

Parent: [api_contract_lean_master.plan.md](api_contract_lean_master.plan.md)

## Цель

Появилось **что** сверять: именованная схема `Form` и `$ref` на 4 path’а в [`vdp/shared/openapi/forms.yaml`](vdp/shared/openapi/forms.yaml).

## Scope

- Только правка `forms.yaml`
- Required: `id`, `account_id`, `organization_id`, `status`, `direction`, `kind`, `created_at`, `updated_at` (как [`CoreForm`](vdp/fe/src/lib/api/forms.ts) / [`formpayment.Form`](vdp/core/internal/domain/formpayment/form.go))
- Path’ы: health; POST forms; GET forms/{id}; POST forms/{id}/actions/{action}

## Вне scope

Helper, httptest, Vitest, docs QG Stage A (это A2–A4)

## DoD

- yaml парсится
- у 4 path’ов есть response schema `$ref`
- нет изменений Go/FE

## Rules

`интеграция-и-события`, `планирование-сверка-с-rules`. Gate этого подэтапа: ручная/parse проверка yaml; полный `ci-pr-fast` — на A4.
