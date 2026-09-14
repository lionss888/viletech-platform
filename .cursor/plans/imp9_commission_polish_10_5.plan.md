---
name: IMP9 commission polish §10.5
overview: "Три режима вознаграждения в обеих точках фиксации ТЗ: post-PP panel + аванс primary."
todos:
  - id: imp9-fe-unit-3modes
    content: FE unit все три режима в панели save payload
    status: pending
  - id: imp9-advance-primary
    content: Проверить/дожать фиксацию комиссии на primary-поручении аванса
    status: pending
  - id: imp9-edge-validation
    content: Edge validation пустой percent/fix → явная ошибка HTTP negative cases
    status: pending
  - id: imp9-vvodnye-sync
    content: Синхронизировать галочки §9 вводных под факт кода
    status: pending
isProject: false
---

# IMP9 — Вознаграждение §10.5

Три режима в обеих точках фиксации ТЗ, не только post-PP panel.

## Цель

Три режима не только normalize, а в полном продуктовом месте.

## Факты

[`commission.go`](../../vdp/core/internal/domain/formpayment/commission.go) + IMP3 HTTP + RateCommissionPanel уже умеют `fixed|percent|percent_plus_fixed`. Чеклист во [`вводные/расширение вводных.txt`](../../вводные/расширение%20вводных.txt) §9 ещё `[ ]`.

## Работы

### 1. FE unit: все три режима в панели

Расширить [`forms-rate-commission.test.ts`](../../vdp/fe/src/lib/api/forms-rate-commission.test.ts) / panel-level test: save payload для `fixed`, `percent`, `percent_plus_fixed`.

### 2. Фиксация комиссии на primary-поручении аванса (10.2 п.1)

Проверить: если manager уже шлёт commission до order — добавить HTTP/unit assert. Если UI дыра на signing_order — минимальный wiring без нового дизайна.

Файлы:
- [`RateCommissionPanel.tsx`](../../vdp/fe/src/components/ved/RateCommissionPanel.tsx)
- [`form_payment.go`](../../vdp/core/internal/service/form_payment.go) `SetCommission`

### 3. Edge validation

Пустой percent / пустой fix → явная ошибка (уже в NormalizeAndCompute) — HTTP negative cases если нет.

Тесты:
- [`commission_test.go`](../../vdp/core/internal/domain/formpayment/commission_test.go)
- [`imp3_commission_modes_test.go`](../../vdp/core/internal/transport/http/imp3_commission_modes_test.go)

### 4. Синхронизировать §9 вводных

После green — обновить галочки §9 в [`вводные/расширение вводных.txt`](../../вводные/расширение%20вводных.txt) под факт кода.

## Вне scope

Четвёртый режим, bank org commission как deal commission, PDF формулы.

## DoD

- [ ] 3 режима × post-PP покрыты тестами
- [ ] Аванс-primary путь зафиксирован тестом или known-gap одной фразой
- [ ] §9 sync

## Сверка с rules

**Обязательны:** `тесты-архитектуры`, `честность-готовности`, `solid`, `правила-построения`.

**Вне scope:** новые режимы, bank org commission redesign, PDF.
