---
name: R8 Hub Real
overview: "RESET ready for re-run. Hub adapters Telegram/Diadoc/OCR/1C/Partner: контрактные тесты без stub-only; callbacks только в core SM."
todos:
  - id: r8-tg-diadoc
    content: Telegram+Diadoc contract adapters
    status: completed
  - id: r8-ocr-1c
    content: OCR+1C idempotent adapters
    status: completed
  - id: r8-callback
    content: Core hub callback Transition only
    status: completed
  - id: r8-tests
    content: Failure/idempotency tests
    status: completed
isProject: false
---

# R8: Hub real adapters

## Цель

Заменить stub-поведение на проверяемые адаптеры с HTTP/fixture; hub не пишет статусы в БД core.

## Якоря

Nest telegram, diadoc, recognition, payment/1c; [`vdp/hub/internal/adapters`](vdp/hub/internal/adapters); shared events.

## Правила

Timeouts/backoff/идемпотентность inbox; деградация без смены статуса; s2s auth; go-resilience.

## Работы

1. Telegram notify: контракт payload + retry; test with httptest recorder.
2. Diadoc sign request + callback → `POST /api/v1/internal/hub/callback` → Transition only.
3. OCR recognize → draft fields callback (не auto-pay).
4. 1C cover/fee idempotent by externalId/event_id.
5. Partner generic dispatch.
6. Failure tests: hub 5xx → outbox retry; form status unchanged.

## DoD

Matrix integration modules: не `stub` в контрактных тестах (env URL или fake server). Inbox idempotent test. Callback path e2e.

## Вне scope

Прод-credentials; Bank webhooks (R10).
