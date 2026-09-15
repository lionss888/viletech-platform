---
name: Phase 6 Export UI E2E
overview: Export кабинеты FE + pilot-matrix browser ladder. После Phase 5 domain. Срок 4-6 дней.
todos:
  - id: exp-ui-cta
    content: FE wizard/actions export + treasurer CTA
    status: pending
  - id: exp-ui-unit
    content: FE unit export projection
    status: pending
  - id: exp-e2e
    content: "@pilot-matrix export ladder spec"
    status: pending
  - id: exp-ci
    content: compose-e2e / path-filter export surface
    status: pending
  - id: exp-ui-docs
    content: Docs e2e matrix + gaps export browser
    status: pending
isProject: false
---

# Phase 6: Export UI / E2E

## Цель и оценка

**Цель:** browser/UAT export ladder на уровне import pilot-matrix.  
**Срок:** 4–6 рабочих дней (~30–40 ч).  
**Базис:** ~20 todos × 3.8 todo/ч + browser.  
**Зависит от:** Phase 5.

## Работы

### 1. FE projection (10–12 ч)

- Wizard direction export / payment method PAY_FROM_EXPORT
- actions.ts + ActionPanel CTA treasurer/manager export
- Copy labels (RW layer) без ПДн у Provider
- Unit: manager-payment / actions export cases

### 2. Pilot-matrix export spec (12–15 ч)

- Новый `@pilot-matrix` spec: export → … → treasurer/overpay path → completed (узкий happy path)
- Не раздувать PR smoke (4 specs); path-filter как у import

### 3. Compose / CI (4–6 ч)

- API journey export в compose-e2e если не сделан в Phase 5
- detect-pilot-matrix regex под export FE files при необходимости

### 4. Docs (2–3 ч)

- e2e-coverage-matrix + known-gaps: export browser заявлен; что ещё вне scope

## DoD

1. Export `@pilot-matrix` green
2. FE unit export green
3. `make playwright-pilot-matrix` включает export
4. Docs honesty sync

## Rules

`playwright-e2e`, `ui-web-практики`, `fe-interaction-contracts` (если upload), `vdp-ci-local-gate` → `ci-pr-pilot` при закрытии фазы.
