---
name: API contract lean master
overview: "Индекс lean-стабилизации FE↔API. Исполнение только по дочерним планам по порядку. C/Pact вне пути."
todos:
  - id: run-a1
    content: "Выполнить api_contract_a1_forms_yaml.plan.md"
    status: pending
  - id: run-a2
    content: "Выполнить api_contract_a2_schema_helper.plan.md"
    status: pending
  - id: run-a3
    content: "Выполнить api_contract_a3_httptest.plan.md"
    status: pending
  - id: run-a4
    content: "Выполнить api_contract_a4_docs_qg.plan.md"
    status: pending
  - id: run-b1
    content: "Выполнить api_contract_b1_golden.plan.md"
    status: pending
  - id: run-b2
    content: "Выполнить api_contract_b2_vitest.plan.md"
    status: pending
  - id: run-b3
    content: "Выполнить api_contract_b3_docs_qg.plan.md"
    status: pending
isProject: false
---

# Lean API contract — master index

Порядок строгий. Каждый файл — одна волна с своим DoD. Не смешивать A и B в одном diff без закрытия предыдущего QG.

## Зачем так

Мелкая декомпозиция → уже DoD → выше качество (меньше «сделали всё сразу и размыли критерий»).

## Карта планов

### Stage A — живой OpenAPI + CI (Go)

1. [api_contract_a1_forms_yaml.plan.md](api_contract_a1_forms_yaml.plan.md) — схемы в yaml
2. [api_contract_a2_schema_helper.plan.md](api_contract_a2_schema_helper.plan.md) — helper validate
3. [api_contract_a3_httptest.plan.md](api_contract_a3_httptest.plan.md) — assert на 4 path’а
4. [api_contract_a4_docs_qg.plan.md](api_contract_a4_docs_qg.plan.md) — docs + QG закрытия Stage A

### Stage B — shared golden (Go + Vitest)

5. [api_contract_b1_golden.plan.md](api_contract_b1_golden.plan.md) — фикстура + schema
6. [api_contract_b2_vitest.plan.md](api_contract_b2_vitest.plan.md) — FE читает golden
7. [api_contract_b3_docs_qg.plan.md](api_contract_b3_docs_qg.plan.md) — docs + QG закрытия Stage B

### Вне пути (отдельные планы не создаём, пока не попросят)

- Step C — codegen типов FE из схемы
- Pact / Karate

## Цель продукта

Ранний сигнал ломающего JSON на критичных form path’ах без Playwright; один golden стыкует FE и контракт.

## Сверка с rules (общая)

Обязательны: `планирование-сверка-с-rules`, `тесты-архитектуры`, `интеграция-и-события`, `честность-готовности`, `vdp-ci-local-gate`, `правила-построения`.

Gate по закрытию stage: A → минимум `go test` + `docs-format-check` затем `ci-pr-fast`; B → + `fe npm test` + `ci-pr-fast`.
