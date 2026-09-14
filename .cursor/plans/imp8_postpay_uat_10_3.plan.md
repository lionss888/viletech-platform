---
name: IMP8 postpay UAT §10.3
overview: "Первый полный browser ladder POSTPAY_RATE_ON_PP: provider-first → курс/комиссия → доп. поручение → казначей → report_waiting."
todos:
  - id: imp8-postpay-ladder
    content: Новый @pilot-matrix spec для RATE_ON_PP полного ladder
    status: pending
  - id: imp8-nextStatus-fix
    content: Исправить UI projection treas_confirm_payment nextStatus по маршруту
    status: pending
  - id: imp8-regress
    content: Регресс IMP2 + FE rate/commission unit
    status: pending
isProject: false
---

# IMP8 — POSTPAY_RATE_ON_PP §10.3

Первый полный browser ladder provider-first → курс/комиссия → доп. поручение → казначей → `report_waiting`.

## Цель

Доказать §10.3 в браузере: provider до рублей, panel rate+commission, advance order, treasurer postpay path.

## Факты

HTTP: [`imp2_postpay_rate_on_pp_test.go`](../../vdp/core/internal/transport/http/imp2_postpay_rate_on_pp_test.go). FE: [`RateCommissionPanel.tsx`](../../vdp/fe/src/components/ved/RateCommissionPanel.tsx), gating в [`manager-payment.ts`](../../vdp/fe/src/lib/ved/manager-payment.ts). Browser journey отсутствует. В [`actions.ts`](../../vdp/fe/src/lib/ved/actions.ts) у `treas_confirm_payment` зашит `nextStatus: "payment_processing"` — для postpay домен ведёт в `report_waiting` (проекция UI врёт).

## Работы

### 1. Новый @pilot-matrix spec для postpay

Новый spec (или ветка в full-ladder): import + `post_payment` → auto mode → provider до рублей → panel rate+один reward_mode → `mgr_advance_signing` (блок без rate) → user upload advance order → treasurer confirm → статус `report_waiting`.

Файл: `vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts` или расширение существующего.

### 2. Исправить UI projection treas_confirm_payment

В [`actions.ts`](../../vdp/fe/src/lib/ved/actions.ts): nextStatus зависит от маршрута:
- advance → `payment_processing`
- RATE_ON_PP → `report_waiting`

Согласованно с доменом. Unit в `manager-payment.test.ts` / actions test.

### 3. Регресс

```sh
go test ./core/internal/transport/http/ -count=1 -run IMP2
npm test -- --run src/lib/ved/manager-payment.test.ts src/lib/api/forms-rate-commission.test.ts
```

## Вне scope

`POSTPAY_FIXED_RATE`, PDF primary-without-rate workshop, все три режима в одном E2E (три режима — P4 unit).

## DoD

- [ ] Postpay `@pilot-matrix` green
- [ ] CTA nextStatus честный (advance vs postpay)
- [ ] IMP2 green
- [ ] FE unit rate/commission green

## Сверка с rules

**Обязательны:** `playwright-e2e`, `use-cases`, `интеграция-и-события` (§3.6 исключение RATE_ON_PP), `честность-готовности`, `vdp-ci-local-gate`.

**Вне scope:** `POSTPAY_FIXED_RATE`, новые продуктовые фичи вне RATE_ON_PP ladder.
