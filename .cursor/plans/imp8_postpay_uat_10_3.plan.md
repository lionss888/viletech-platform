---
name: IMP8 postpay UAT §10.3
overview: "Первый полный browser ladder POSTPAY_RATE_ON_PP: provider-first → курс/комиссия → доп. поручение → казначей → report_waiting."
todos:
  - id: imp8-postpay-ladder
    content: Новый @pilot-matrix spec для RATE_ON_PP полного ladder
    status: completed
  - id: imp8-nextStatus-fix
    content: Исправить UI projection treas_confirm_payment nextStatus по маршруту
    status: completed
  - id: imp8-regress
    content: Регресс IMP2 + FE rate/commission unit
    status: completed
isProject: false
---

# IMP8 — POSTPAY_RATE_ON_PP §10.3

Первый полный browser ladder provider-first → курс/комиссия → доп. поручение → казначей → `report_waiting`.

## Цель

Доказать §10.3 в браузере: provider до рублей, panel rate+commission, advance order, treasurer postpay path.

## Факты

HTTP: [`imp2_postpay_rate_on_pp_test.go`](../../vdp/core/internal/transport/http/imp2_postpay_rate_on_pp_test.go). FE: [`RateCommissionPanel.tsx`](../../vdp/fe/src/components/ved/RateCommissionPanel.tsx), gating в [`manager-payment.ts`](../../vdp/fe/src/lib/ved/manager-payment.ts). Browser journey exists: [`pilot-matrix-postpay-rate.spec.ts`](../../vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts) (`@pilot-matrix`, IMP8) through completed. `treas_confirm_payment` nextStatus follows route (advance → `payment_processing`, RATE_ON_PP → `report_waiting`).

## Работы

### 1. Новый @pilot-matrix spec для postpay

Done. Spec: `vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts` — import + `post_payment` → provider-first → rate/commission → advance order → treasurer → `report_waiting` → completed.

### 2. Исправить UI projection treas_confirm_payment

Done. nextStatus зависит от маршрута: advance → `payment_processing`; RATE_ON_PP → `report_waiting`.

### 3. Регресс

Done historically with IMP2 HTTP and FE rate/commission unit green.

## Вне scope

`POSTPAY_FIXED_RATE`, PDF primary-without-rate workshop, все три режима в одном E2E (три режима — P4 unit).

## DoD

- [x] Postpay `@pilot-matrix` green
- [x] CTA nextStatus честный (advance vs postpay)
- [x] IMP2 green
- [x] FE unit rate/commission green

## Сверка с rules

**Обязательны:** `playwright-e2e`, `use-cases`, `интеграция-и-события` (§3.6 исключение RATE_ON_PP), `честность-готовности`, `vdp-ci-local-gate`.

**Вне scope:** `POSTPAY_FIXED_RATE`, новые продуктовые фичи вне RATE_ON_PP ladder.
