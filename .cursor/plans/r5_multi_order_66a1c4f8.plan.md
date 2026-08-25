---
name: R5 Multi Order
overview: Несколько поручений на заявку (основное + ADVANCE_*) и активное поручение для провайдера — расширение §3.
todos:
  - id: r5-entity
    content: Order entity + activeOrderId
    status: pending
  - id: r5-advance-api
    content: ADVANCE_* manager/user APIs
    status: pending
  - id: r5-shipment
    content: SHIPMENT_* API wiring
    status: pending
  - id: r5-tests
    content: Multi-order + provider active tests
    status: pending
isProject: false
---

# R5: Multi-order (основное + ADVANCE)

## Цель

Одна заявка — N поручений; статусы ADVANCE_SIGNING_ORDER_*; active order для исполнения провайдером.

## Источник

[`расширение вводных.txt`](вводные/расширение%20вводных.txt) §3; Nest ADVANCE_* transitions.

## Правила

SM в core; Provider видит только реквизиты/суммы активного поручения без ПДн.

## Работы

1. Сущность Order (principal instruction): kind main|advance, formId, status, files, rate/commission snapshot.
2. Связь Form.activeOrderId.
3. Manager actions: create/send/accept/reject/revoke advance (зеркало Nest order-advance).
4. User upload signed advance.
5. SHIPMENT_* стык с постоплатой (статусы уже в SM — дожать API).
6. Тесты: 2 поручения на form; provider видит active only.

## DoD

§9 пункт «несколько поручений» = done. Nest order-advance routes ≥95% done.

## Вне scope

Отчёт на каждое поручение vs один (открытый вопрос — default: один отчёт на заявку до ТЗ).
