---
name: R6 Rate Docs Gen
overview: RESET ready for re-run. Rate, Commission, payment-order generation, Excel template import — Nest money/docs path.
todos:
  - id: r6-calc
    content: Full rate/commission domain
    status: completed
  - id: r6-pog
    content: Async payment-order generation
    status: completed
  - id: r6-excel
    content: Template Excel import
    status: completed
  - id: r6-tests
    content: Calc + outbox docs tests
    status: completed
isProject: false
---

# R6: Rate, Commission, POG, Template

## Цель

Расчёт курса/комиссии и генерация поручений/отчётов через outbox→hub docs.generate; Excel import CREATING→DRAFT.

## Якоря

Nest `rate`, `commission-calculation`, `payment-order-generation`, `template`.

## Правила

Деньги идемпотентны; генерация не меняет статус напрямую (событие→callback/action); тесты расчёта.

## Работы

1. Domain services CalculateRate/Commission (расширить до Nest semantics: наценка, bank flag hook для R10).
2. Async POG: outbox TypeDocsGenerate; результат file meta на form/order.
3. Разные шаблоны import vs export.
4. Excel/template import: parse → forms CREATING→DRAFT (не только JSON rows stub).
5. Свести дубли GenerateDocs/POG.

## DoD

MOD-RATE/MOD-COMM из gap = есть. Contract test: enqueue→hub→file attached. Import path tested.

## Вне scope

Реальный Diadoc sign (R8); Bank readonly rate UI (R10).
