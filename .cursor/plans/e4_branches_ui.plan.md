---
name: E4 Branches UI
overview: "Ветки lifecycle только в UI: corrections ECO↔User, cancel User/ECO, postpay import до COMPLETED; регрессия happy-path E3."
todos:
  - id: e4-corrections
    content: Corrections round-trip ECO reject → User accept_corrections в UI
    status: pending
  - id: e4-cancel
    content: Cancel User + ECO в UI → terminal, 0 mutate CTA
    status: pending
  - id: e4-postpay
    content: Postpay UI-путь до COMPLETED (direction + порядок CTA)
    status: pending
  - id: e4-qa
    content: "QA gate E4: 3 ветки UI + регрессия E3 happy-path"
    status: pending
isProject: false
---

# E4 — Ветки lifecycle в UI

## Зависимость

После зелёного **E3** (happy-path UI → `COMPLETED`).

## Цель

Corrections, cancel и postpay проходятся **без curl/Swagger**, только через BDUI UI.

## Строгий критерий (вклад в DoD программы)

Оператор в UI проходит **corrections, cancel и postpay до `COMPLETED`** (без API-обходов).

## Scope

- Corrections: ECO reject (текст в UI) → User list/detail `accept_corrections` → снова ECO queue
- Cancel: User + ECO (+ ICO/Manager если CTA уже в matrix) → terminal hint, 0 mutate CTA
- Postpay: wizard постоплата → стабильный UI-путь до `COMPLETED`: жёстко `direction=import` + порядок `payment_received` → report → shipment; schema hints / disable невалидных CTA по StageHash из [`NOTES.md`](fe-experiment/NOTES.md)
- Не чинить весь доменный `checkTransit` шире, чем нужно для одного зелёного postpay UI-прогона
- LIFECYCLE: секция branches UI + quality gate E4

## Вне

Refund, Bank API, субагент, полный рефакторинг state machine.

## Опора

- Matrix ветки P7: [`lifecycle-action.matrix.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/lifecycle-action.matrix.ts)
- StageHash gaps: [`NOTES.md`](fe-experiment/NOTES.md)
- Вводные: [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt), постpay из расширения FigJam — только UI-путь, не полный эпик

## Проверка стабильности и качества

1. Corrections round-trip только UI
2. Cancel User и ECO только UI
3. Postpay → `COMPLETED` только UI
4. Регрессия E3 happy-path (повторный прогон или эквивалентный smoke)
5. Самопроверка StageHash advance vs postpay в NOTES актуальна
