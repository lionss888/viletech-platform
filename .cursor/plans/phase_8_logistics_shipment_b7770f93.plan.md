---
name: Phase 8 Logistics Shipment
overview: "SHIPMENT_* как явная ветка (не happy path report→completed): domain polish, UI, E2E. Частично в SM. Срок 7-9 дней."
todos:
  - id: ship-contract
    content: "Contract docs: shipment ветка vs report completed"
    status: pending
  - id: ship-domain
    content: Domain/unit shipment transitions polish
    status: pending
  - id: ship-api
    content: HTTP + compose shipment branch
    status: pending
  - id: ship-ui
    content: FE CTA/copy shipment Manager/User
    status: pending
  - id: ship-e2e
    content: E2E shipment branch pilot-matrix
    status: pending
  - id: ship-docs
    content: known-gaps/readiness logistics honesty
    status: pending
isProject: false
---

# Phase 8: Logistics / Shipment

## Цель и оценка

**Цель:** контур SHIPMENT_* из вводных как **ветка**, не замена report→completed.  
**Срок:** 7–9 рабочих дней (~50–65 ч).  
**Базис:** ~35 todos × 3.8 todo/ч.  
**Вне scope:** полный «флоу логистов» как отдельный продукт (§8 вводных).

## Факты

Статусы/actions shipment уже в domain + nest map; compose P5 shipment API; pilot-matrix имеет shipment steps. Нужно: честный product UI, gaps, E2E полнота ветки, docs.

## Работы

### 1. Domain / docs contract (10–12 ч)

- Зафиксировать: happy path = report accept → completed; shipment optional branch
- Gaps: logistics module placeholder vs SHIPMENT_* in-app
- Unit continuity shipment transitions

### 2. API polish (8–10 ч)

- HTTP coverage manager/user shipment accept/reject
- compose-e2e assert ветки

### 3. FE (15–18 ч)

- CTA/copy shipment в Manager/User
- Не смешивать с money RATE_ON_PP
- Unit actions

### 4. E2E (10–12 ч)

- Явный shipment branch spec в pilot-matrix (не обязательный PR smoke)

### 5. Docs (4–5 ч)

- form-lifecycle, scenario directory, readiness: logistics % честный

## DoD

1. Ветка shipment green unit/API/E2E
2. Happy path report→completed не сломан
3. Docs: ветка vs out-of-scope logistics product

## Rules

`ui-web-практики` (guided next step), `use-cases`, `тесты-архитектуры`, `честность-готовности`.
