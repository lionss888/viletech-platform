---
name: R12 Verification
overview: "Финальный gate: compose E2E User→Provider, полная матрица Nest↔vdp↔ВИ↔расширение без дыр, самопроверка правил."
todos:
  - id: r12-e2e
    content: Compose E2E User→Provider path
    status: completed
  - id: r12-matrix
    content: Matrix zero missing in-scope
    status: completed
  - id: r12-checklist
    content: Extension §9 + rules smoke tests
    status: completed
isProject: false
---

# R12: Verification gate

## Цель

Доказать соответствие программы критерию «100%» по трём источникам + Nest behavior — проверяемо, без ложных claims.

## Правила

Честность-готовности; AuthZ; no PII provider; отдельные БД; идемпотентность; тесты.

## Работы

1. `docker compose` core+hub+postgres: миграции apply; health both.
2. E2E script/test: User create→ICO→ECO→contract→order→payment→provider sent→report (и refund branch smoke).
3. Matrix: 0 `missing` для in-scope Nest modules; 0 `stub` для заявленных интеграций R8.
4. Расширение §9 checklist все `[x]` в test assertions.
5. Самопроверка rules: список checks в test `TestProjectRulesSmoke`.

## DoD

- `go test ./...` core+hub green
- compose E2E green
- Matrix report: in-scope 100% done
- Явный вердикт в ответе агента с цифрами (не «вроде готово»)

## Вне scope

fe/analytics/assistant implementation; логистика.
