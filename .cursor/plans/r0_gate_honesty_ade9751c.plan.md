---
name: R0 Gate Honesty
overview: "Gate программы vdp: правило честности готовности, инвентарь Nest↔vdp↔ВИ↔расширение, Postgres path в compose. Без этого нельзя закрывать последующие R*."
todos:
  - id: r0-honesty-rule
    content: Создать .cursor/rules/честность-готовности.mdc (alwaysApply)
    status: pending
  - id: r0-inventory
    content: Расширить Nest↔vdp endpoint matrix в тестах
    status: pending
  - id: r0-postgres
    content: Compose Postgres default + migrations
    status: pending
  - id: r0-gate
    content: Gate baseline % без ложного 100%
    status: pending
isProject: false
---

# R0: Gate + Honesty + Inventory

## Цель

Зафиксировать правила честной готовности и измеримую baseline-матрицу до любой реализации R1+.

## Источники

- Nest: [`backend-for-ved/src/modules`](кастомные%20модули%20для%20адаптации%20и%20переиспользования/backend-for-ved/src/modules)
- [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt), [`вводные/расширение вводных.txt`](вводные/расширение%20вводных.txt)
- [`заметки/gap-analysis-backend.md`](заметки/gap-analysis-backend.md)
- Текущий [`vdp/`](vdp/)

## Правила (`.cursor/rules`)

Учесть: границы, интеграция/события, роли/ПДн, устойчивость, go-*, правила-построения. Документацию не плодить без запроса.

## Работы

1. Создать [`.cursor/rules/честность-готовности.mdc`](.cursor/rules/честность-готовности.mdc) (`alwaysApply: true`):
   - нельзя `completed` / «100%» / «паритет», если DoD плана не выполнен;
   - stub/каркас = частично + явный %;
   - перед complete — самопроверка по проверяемому критерию (не только happy-path tests).
2. Инвентарь всех Nest HTTP routes (минимум form-payment ~140 + auth/org/contract/…) → таблица в тестах [`vdp/core/internal/transport/http/endpoint_matrix_test.go`](vdp/core/internal/transport/http/endpoint_matrix_test.go) (расширить): Nest path, vdp path, status `missing|stub|done`.
3. [`vdp/docker-compose.yml`](vdp/docker-compose.yml): default `STORE_DRIVER=postgres` для core; миграции 001/002 применяются; memory только для unit.
4. Короткий gate в ответе агента (не новый md без запроса): baseline % по form routes / gap Must / расширение §9.

## DoD

- Rule-файл существует и alwaysApply.
- Matrix-тест содержит полный список Nest form-payment routes + ключевые модули; большинство строк `missing` допустимо на R0.
- `docker compose` поднимает postgres-core/hub; core с postgres проходит health.
- Никакой claim «паритет 100%».

## Вне scope

Реализация бизнес-логики R1+.
