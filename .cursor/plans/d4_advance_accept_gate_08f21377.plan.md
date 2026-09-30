---
name: D4 advance accept gate
overview: "Срез D4: «Подтвердить доп. поручение» недоступно, пока не взято в проверку (#14). Gate ci-pr-pilot."
todos:
  - id: d4-matrix
    content: Убрать advance_accept с waiting_verification в матрице FE
    status: pending
  - id: d4-gate
    content: Unit + ci-pr-pilot + Acceptance + notify + закрыть план
    status: pending
isProject: false
---

# D4 — Disable confirm до взятия доп. поручения

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md).

## Запрос заказчика

Пока доп. поручение не взято в проверку, кнопка «Подтвердить доп. поручение» неактивна — без 409 в консоли.

## Acceptance

Manager на `advance_signing_order_waiting_verification`: «Подтвердить» disabled (или отсутствует) с понятной причиной; после «Взять доп. поручение в проверку» Confirm доступен и проходит без 409.

## Вне scope

Обычный `signing_order_waiting_verification` (там accept уже только после start); смена core transition rules сверх выравнивания FE-матрицы.

## Подход (зафиксирован)

В [`actions.ts`](vdp/fe/src/lib/ved/actions.ts) убрать `mgr_order_advance_accept` со статуса `advance_signing_order_waiting_verification` (оставить на `advance_signing_order_verification`). Согласовать [`app-actions.ts`](vdp/fe/src/lib/ved/app-actions.ts) / ActionPanel. Core по-прежнему отвергает чужой переход — FE не обходит AuthZ.

## Сверка с rules

`use-cases`, `интеграция-и-события`, `честность-готовности`, `vdp-ci-local-gate` (**ci-pr-pilot** — ActionPanel/ladder), `plan-закрытие-и-dod`, `mgmt-tg-notify`.

## Слои

- FE матрица + unit manager-flow / actions
- Gate: `make ci-pr-pilot`

## Корнеры

stop → waiting снова; demo vs app; обычный order path без регрессии.

## DoD / QG

`check-env-parity` → unit → `ci-pr-pilot` → Acceptance → lead-time → notify → закрыть план.
