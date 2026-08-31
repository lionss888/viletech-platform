---
name: R10 Bank API
overview: "Канал Bank §5 расширения: тип клиента Bank, idempotent create/update заявки, webhooks статусов, комиссия/наценка."
todos:
  - id: r10-type
    content: ClientType Bank + admin settings
    status: completed
  - id: r10-api
    content: Idempotent bank forms API
    status: completed
  - id: r10-webhooks
    content: Webhooks status/sign
    status: completed
  - id: r10-tests
    content: Autoskip + RBAC tests
    status: completed
isProject: false
---

# R10: Bank API channel

## Цель

Отдельный API-канал банка из [`расширение вводных.txt`](вводные/расширение%20вводных.txt) §5.

## Правила

Отдельный technical client AuthN/AuthZ; зона видимости только bank-заявки; идемпотентность create; Provider без ПДн; версия `/api/v1/bank/...`.

## Работы

1. ClientType Bank на organization/account: fixed commission; flag applyPlatformMarkup.
2. `POST /api/v1/bank/forms` idempotent (Idempotency-Key); payload org/counterparty/amount/files refs.
3. Status responses + correlation id; webhook/poll на status_changed / sign request.
4. Автоматизации: skip steps if org approved + active contract + default agent (как на доске).
5. Manager UI fields: channel=bank|ui; rate/commission maybe read-only for Bank.
6. Тесты: idempotent double-create; webhook delivery; RBAC bank client cannot see other orgs.

## DoD

§9 Bank checklist item = done. Contract tests for create+webhook. Нет ПДн в provider views.

## Вне scope

Полный UX банка; логистика.
