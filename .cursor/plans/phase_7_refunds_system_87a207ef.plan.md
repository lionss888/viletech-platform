---
name: Phase 7 Refunds System
overview: "PAYMENT_REFUND_* довести до полного product: инвариант cancel, Manager UI, E2E. Domain частично есть. Срок 6-8 дней."
todos:
  - id: ref-invariant
    content: Инвариант cancel vs невозвращённый остаток + unit
    status: pending
  - id: ref-api
    content: HTTP Manager refund + AuthZ tests
    status: pending
  - id: ref-ui
    content: FE Manager refund panel/CTA
    status: pending
  - id: ref-e2e
    content: E2E refund journey
    status: pending
  - id: ref-docs
    content: form-lifecycle + §9 checkbox sync
    status: pending
isProject: false
---

# Phase 7: Refunds System

## Цель и оценка

**Цель:** закрыть §4 вводных — возврат ДС + инвариант «не CANCELED при невозвращённом остатке».  
**Срок:** 6–8 рабочих дней (~45–55 ч).  
**Базис:** ~30 todos × 3.8 todo/ч.  
**Параллельно** с Phase 5–6 после Milestone 1.

## Факты в коде

Уже есть:

- статусы `payment_refund_waiting|processing|sent`
- actions `refund_init/start/stop/sent/cancel` + nest map
- [`refund_test.go`](vdp/core/internal/domain/formpayment/refund_test.go) unit happy path
- поля `FundsRefunded`, `RefundAmount`, …

Пробелы: UI Manager, HTTP/E2E полнота, инвариант cancel из §4.6 вводных `[ ]`.

## Работы

### 1. Domain hardening (10–12 ч)

- Инвариант: нельзя финальный CANCELED_* при `FundsHeld && !FundsRefunded` (или явный write-off — out of scope)
- Edge: stop/cancel, сумма/валюта сверка
- Unit negative cases

### 2. API (8–10 ч)

- HTTP Manager refund routes + AuthZ
- File attach confirmation optional
- HTTP tests + compose journey

### 3. FE Manager (12–15 ч)

- Страница/панель процесса возврата (§4.4)
- CTA: начать / подтвердить / отменить / прекратить
- Unit + gesture file если attach

### 4. E2E (8–10 ч)

- `@pilot-matrix` или dedicated refund journey
- Не в PR smoke без нужды

### 5. Docs / §9 (3–4 ч)

- form-lifecycle refund branch
- Галочка §9 state machine возврата после green

## DoD

1. Инвариант cancel + unit/HTTP green
2. Manager UI usable
3. E2E refund green
4. §9 checkbox sync

## Rules

`use-cases`, `безопасность-ролей-и-данных` (Provider без ПДн на refund), `тесты-архитектуры`, `честность-готовности`.
