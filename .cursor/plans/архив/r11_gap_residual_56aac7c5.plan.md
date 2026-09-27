---
name: R11 Gap Residual
overview: Закрыть все Must/Should из gap-analysis-backend.md, что ещё не закрыто R1–R10.
todos:
  - id: r11-audit
    content: Audit gap IDs vs vdp
    status: completed
  - id: r11-fix
    content: Implement residual Must/Should
    status: completed
  - id: r11-test
    content: TestGapChecklistComplete green
    status: completed
isProject: false
---

# R11: Gap Must/Should residual

## Цель

Пройти [`заметки/gap-analysis-backend.md`](заметки/gap-analysis-backend.md) §7: каждый Must/Should ID → `есть` в vdp.

## Правила

Честность готовности: нельзя закрыть R11 при открытых ID; самопроверка по таблице.

## Работы

1. Ревизия matrix: Must (PII, deadline, awaiting/rating, rate/commission) + Should (ECO alias, assign, XOR hash, unblock, no-docs, immutable org, POG TODOs, VA dedupe).
2. Добить дыры, не закрытые R1–R10.
3. Обновить статусы в endpoint/gap test table.
4. Самопроверка: список ID все `есть` или явно out-of-scope с обоснованием (только REPORTER).

## DoD

Gap Must=4/4, Should=8/8 (или documented defer с причиной). Тест `TestGapChecklistComplete` red→green.

## Вне scope

Новые фичи вне gap/ВИ/расширения.
