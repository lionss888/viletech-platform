---
name: Flow spine hardening
overview: "Один spine + явные ветки без расхождения CTA/AuthZ/docs: сверка матрицы статус×роль×действие."
todos:
  - id: flow-matrix-check
    content: Матрица сверки advance/RATE_ON_PP/continuity/corrections/refund/provider return
    status: completed
  - id: flow-fix-projections
    content: Починить найденные расхождения проекции UI/domain
    status: completed
  - id: flow-lifecycle-sync
    content: Зафиксировать в form-lifecycle pilot happy path
    status: completed
  - id: flow-unit-tests
    content: Точечные unit/continuity contract если CTA менялись
    status: completed
isProject: false
---

# Flow spine hardening

Один spine + явные ветки без расхождения CTA/AuthZ/docs.

## Цель

Один канонический spine + явные ветки без «двух истин».

## Работы

### 1. Матрица сверки

Таблица в ответе/plan progress, не новый ops-doc без нужды: advance / RATE_ON_PP / continuity без ICO·ECO / corrections / refund / provider return — статус × роль × действие vs [`actions.ts`](../../vdp/fe/src/lib/ved/actions.ts) + domain `RoleMayPerform` + bridge.

Проверить:
- [`actions.ts`](../../vdp/fe/src/lib/ved/actions.ts): MATRIX роли × статусы
- Domain: [`actions.go`](../../vdp/core/internal/domain/formpayment/actions.go) `RoleMayPerform`
- Bridge: [`action-bridge.ts`](../../vdp/fe/src/lib/ved/action-bridge.ts)

### 2. Починить расхождения проекции

По образцу treasurer nextStatus (IMP8): если UI CTA/nextStatus не соответствует domain transitions — выровнять. Не добавлять продуктовые фичи.

### 3. Зафиксировать в form-lifecycle.md

[`form-lifecycle.md`](../../vdp/docs/domain/form-lifecycle.md): pilot happy path = report→completed; shipment — ветка, не обязательный ladder.

### 4. Точечные unit/continuity contract

Если CTA менялись — unit в затронутых местах + регресс `cta-continuity-contract.test.ts` если есть.

## Вне scope

Логистика, Nest migration, analytics, export overpay redesign.

## DoD

- [ ] Список расхождений пуст или все закрыты
- [ ] lifecycle честен
- [ ] `make test` / затронутые FE unit green

## Сверка с rules

**Обязательны:** `use-cases`, `чистая-архитектура`, `честность-готовности`, `правила-построения`.

**Вне scope:** новые продуктовые фичи, ML/analytics, логистика.
