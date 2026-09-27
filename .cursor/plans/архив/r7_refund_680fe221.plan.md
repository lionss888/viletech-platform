---
name: R7 Refund
overview: "RESET ready for re-run. Возврат ДС клиенту §4 расширения: REFUND_* SM + инвариант не финализировать CANCELED при невозвращённых средствах."
todos:
  - id: r7-api
    content: REFUND_* actions + API
    status: completed
  - id: r7-invariant
    content: Invariant block CANCELED with unrefunded funds
    status: completed
  - id: r7-audit
    content: Refund audit + file attach
    status: completed
  - id: r7-tests
    content: Refund unit/smoke tests
    status: completed
isProject: false
---

# R7: Refund (возврат ДС)

## Цель

Контур PAYMENT_REFUND_* и инвариант отмены из [`расширение вводных.txt`](вводные/расширение%20вводных.txt) §4; Nest refund actions manager.

## Правила

Идемпотентность денежных операций; Provider без ПДн; аудит кто инициировал/подтвердил; корреляция form_payment_id.

## Работы

1. Actions: refund/init, start, stop, sent, cancel → статусы WAITING/PROCESSING/SENT.
2. Страница/API процесса возврата: сумма/валюта сверка с поступившими; опциональный файл подтверждения.
3. Инвариант: запрет финального CANCELED_* при невозвращённом остатке (или явная ошибка Conflict).
4. История compliance/refund events.
5. Тесты: happy-path refund; cancel blocked while funds held; cancel after REFUND_SENT ok.

## DoD

§9 «state machine возврата» = done. Nest manager refund routes done. `go test` green.

## Вне scope

Списание/удержание без возврата (out of scope расширения).
