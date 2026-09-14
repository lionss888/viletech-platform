---
name: IMP7 advance UAT §10.2
overview: "Доказать импорт аванс §10.2 в браузере: deadline E2E казначея и честность docs pilot-matrix coverage."
todos:
  - id: imp7-deadline-e2e
    content: Расширить pilot-matrix: deadline modal казначея + assert payment_processing
    status: completed
  - id: imp7-playwright
    content: Прогнать make playwright-pilot-matrix
    status: in_progress
  - id: imp7-docs-sync
    content: Обновить known-gaps + form-lifecycle по advance treasurer
    status: pending
  - id: imp7-regress
    content: Регресс go test -run IMP1
    status: pending
isProject: false
---

# IMP7 — Импорт аванс §10.2

Закрывает честность browser coverage после [IMP6](imp6_verify_package_95a93911.plan.md). Treasurer уже в pilot-matrix, дожимаем `execution_deadline` E2E и docs.

## Цель

Доказать §10.2 в браузере и закрыть честность docs (treasurer уже в pilot-matrix).

## Факты

[`pilot-matrix-full-ladder.spec.ts`](../../vdp/fe/e2e/pilot-matrix-full-ladder.spec.ts) уже: hide mgr payment_start → `awaits-treasurer` → confirm → `payment_processing`. HTTP: [`imp1_treasurer_advance_test.go`](../../vdp/core/internal/transport/http/imp1_treasurer_advance_test.go). Нет E2E на `execution_deadline`; docs всё ещё пишут «pilot-matrix под treasurer не заявлен».

## Работы

### 1. Расширить ladder: deadline в UI казначея

Модалка в [`ActionPanel.tsx`](../../vdp/fe/src/components/ved/ActionPanel.tsx):
- При `treas_confirm_payment` показать поле `execution_deadline` (опционально).
- Assert в spec, что после confirm заявка в `payment_processing`.

### 2. Прогнать pilot-matrix

```sh
cd vdp && make playwright-pilot-matrix
```

Shell с `required_permissions: ["all"]` (`vdp-ci-local-gate`).

### 3. Обновить docs

[`known-gaps.md`](../../vdp/docs/pilot/known-gaps.md) и [`form-lifecycle.md`](../../vdp/docs/domain/form-lifecycle.md):
- Advance treasurer в `@pilot-matrix` **заявлен** (deadline покрыт).
- Полный wizard `payment_method: advance` end-to-end — всё ещё **вне этого пакета**.

### 4. Регресс

```sh
go test ./core/internal/transport/http/ -count=1 -run IMP1
```

## Вне scope

POSTPAY ladder, PDF, PR smoke расширение, `POSTPAY_FIXED_RATE`.

## DoD

- [ ] Deadline E2E green
- [ ] Docs sync (known-gaps + form-lifecycle честны)
- [ ] IMP1 green

## Сверка с rules

**Обязательны:** `playwright-e2e`, `честность-готовности`, `vdp-ci-local-gate`, `use-cases`, `безопасность-ролей-и-данных`.

**Вне scope:** новые продуктовые фичи, POSTPAY, `release-gate`.
