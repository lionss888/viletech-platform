---
name: R1 FormPayment SM
overview: Полный FormPayment state machine и ролевые API по Nest + статусы расширения §6. Критерий ≥95% Nest form-payment actions.
todos:
  - id: r1-actions
    content: Полный nestActionMap + поля form
    status: completed
  - id: r1-routes
    content: Ролевые Nest-path handlers ≥95%
    status: completed
  - id: r1-logic
    content: Разбить логику transition из Nest service
    status: completed
  - id: r1-tests
    content: Table-driven SM + smoke ICO/ECO/manager
    status: completed
isProject: false
---

# R1: FormPayment SM + Role APIs

## Цель

Домен заявки: все таблицы переходов Nest и ≥95% HTTP actions form-payment по ролям.

## Якоря Nest

- [`form-payment.constants.ts`](кастомные%20модули%20для%20адаптации%20и%20переиспользования/backend-for-ved/src/modules/form-payment/form-payment.constants.ts)
- [`form-payment.service.ts`](кастомные%20модули%20для%20адаптации%20и%20переиспользования/backend-for-ved/src/modules/form-payment/service/form-payment.service.ts)
- Controllers: `web/{site,manager,provider,compliance-officer,internal-compliance-officer,treasurer,one-c,admin}`

## Правила

SM — единственный путь смены статуса (`интеграция-и-события`); AuthZ zone на endpoint (`безопасность-ролей-и-данных`); table-driven tests (`go-testing`).

## Работы

1. Расширить [`vdp/core/internal/domain/formpayment/`](vdp/core/internal/domain/formpayment/): полный `nestActionMap` по всем PUT/PATCH Nest; поля invoice/docs/paymentMethod/postpay.
2. Ролевые маршруты `/api/v1/{site|manager|provider|eco|ico|treasurer|admin|1c}/form-payment/...` — паритет путей Nest (не только generic actions).
3. Порт ключевой логики `checkTransit` / side-effects из service (без монолита 9k: разбить transition/docs/assign).
4. Provider GET — projection без ПДн (уже есть — не регрессировать).
5. Тесты: все ключи transitionsImport/Export/rate-on-provider; smoke create→draft→ICO→ECO→manager order.

## DoD

- Matrix form-payment: ≥95% Nest routes = `done` (не stub).
- `go test` domain/formpayment + http green.
- Самопроверка: недопустимый переход и чужая роль → 403/409.

## Вне scope

Contracts multi-type (R3), Bank API (R10), реальные hub adapters (R8).
