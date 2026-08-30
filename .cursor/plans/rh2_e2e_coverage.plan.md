---
name: RH2 E2E Coverage
overview: "Расширение compose-e2e (ICO, reject, refund) + Playwright (completed, manager-payment) + e2e-coverage-matrix.md. Без combinatorial role×status E2E."
todos:
  - id: rh2-api-ico
    content: compose-e2e — ветка ICO org-pending (org approve → form flow)
    status: pending
  - id: rh2-api-reject
    content: compose-e2e — ECO reject → corrections → resubmit
    status: pending
  - id: rh2-api-refund
    content: compose-e2e — refund полный цикл до payment_refund_sent smoke
    status: pending
  - id: rh2-pw-completed
    content: Playwright completed-journey.spec.ts (UI до completed или manager close)
    status: pending
  - id: rh2-pw-payment
    content: Playwright manager-payment.spec.ts — provider + payment CTA
    status: pending
  - id: rh2-matrix
    content: vdp/docs/development/e2e-coverage-matrix.md
    status: pending
  - id: rh2-rd11-link
    content: RD11 plan — note superseded by RH2 for expansion scope
    status: pending
  - id: rh2-gate
    content: "DoD: новые journeys green локально и в CI"
    status: pending
isProject: false
---

# RH2 — E2E Coverage Expansion & Matrix

## Meta

- **ID:** RH2 · **Группа:** E2E / journeys · **Зависимости:** RH0 (CI jobs), RD10/RD11 baseline · **Оценка:** 3–4 дня
- **Known-gaps:** «Playwright UI coverage», «Incomplete coverage» — [`vdp/docs/pilot/known-gaps.md`](../../vdp/docs/pilot/known-gaps.md)
- **Master:** [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md)

## Scope

**In:**

- Расширение [`vdp/scripts/compose-e2e.sh`](../../vdp/scripts/compose-e2e.sh): ICO path, ECO reject, refund full cycle
- Новые Playwright specs в [`vdp/fe/e2e/`](../../vdp/fe/e2e/)
- Матрица покрытия [`vdp/docs/development/e2e-coverage-matrix.md`](../../vdp/docs/development/e2e-coverage-matrix.md)
- Обновление known-gaps по E2E

**Out:**

- Combinatorial E2E все роли × ~50 статусов (остаётся unit + matrix honesty)
- Demo `/demo/*` E2E
- ML/OCR real pipeline E2E
- Advance/treasurer full branch (optional P2 one transition only)

## Rules gate

**Обязательны:**

- [`тесты-архитектуры`](../.cursor/rules/тесты-архитектуры.mdc) — journey E2E, не вся матрица в browser
- [`playwright-e2e`](../.cursor/rules/playwright-e2e.mdc) — getByRole, fixtures, no hardcoded timeouts
- [`use-cases`](../.cursor/rules/use-cases.mdc) — допустимые переходы ролей
- [`безопасность-ролей-и-данных`](../.cursor/rules/безопасность-ролей-и-данных.mdc) — provider ACL в E2E
- [`ui-web-практики`](../.cursor/rules/ui-web-практики.mdc) — CTA labels из RW9 copy layer
- [`честность-готовности`](../.cursor/rules/честность-готовности.mdc) — matrix явно показывает пробелы
- [`правила-построения`](../.cursor/rules/правила-построения.mdc)

**Вне scope:** Playwright на все кабинеты × все upload types.

## Prerequisites

- [x] RD10 `make integration-gate` green
- [x] RD11: 4 spec (happy, reject, provider-acl, bank-badge)
- [x] RW9 copy consistency (stable labels for Playwright)
- [ ] RH0 CI playwright job

## Текущее покрытие (baseline)

**API** ([`compose-e2e.sh`](../../vdp/scripts/compose-e2e.sh)):

- Main: User → completed (1 form `$ID`)
- Refund smoke: cancel → 409
- Spots: RD7 provider_start, RD8 root cancel, RD9 bank channel

**Playwright** ([`vdp/fe/e2e/`](../../vdp/fe/e2e/)):

- `happy-path.spec.ts` — до «Назначить агента»
- `reject-path.spec.ts` — ECO reject → user resubmit
- `provider-acl.spec.ts` — no PII columns
- `bank-badge.spec.ts` — bank channel badge

## Работы

### 1. API E2E extensions (`compose-e2e.sh`)

**ICO org-pending branch:**

- Создать org/user без pre-approved org (или reset org state fixture)
- Path: `organization_waiting_verification` → ICO approve org → ICO form start/accept → ECO

**ECO reject branch (отдельная form `$ID_REJECT`):**

- ECO reject → `form_waiting_corrections`
- User resubmit → back to verification queue
- Assert status transitions via API

**Refund full cycle (form `$ID_REFUND_FULL`):**

- После `payment_received`: refund init → processing → sent (smoke)
- Не все валюты — одна EUR/USD path

**Optional P2:** один переход `advance_signing_order` — document in matrix as partial.

### 2. Playwright specs

**`completed-journey.spec.ts`:**

- Seed via [`e2e/helpers/api.ts`](../../vdp/fe/e2e/helpers/api.ts) where needed
- UI login sessions: user → eco → manager → provider (subset)
- Assert final status badge or manager «Завершить» CTA → completed
- Timeout: web-first assertions per playwright-e2e rule

**`manager-payment.spec.ts`:**

- Form at `form_accepted` or later via API seed
- Manager: assign provider, payment received/start CTAs visible
- Provider: payment sent button (mirror RD7)

**ICO org queue (optional third spec or extend happy-path):**

- If seed allows pending org — ICO nav + approve CTA

### 3. Coverage matrix doc

[`vdp/docs/development/e2e-coverage-matrix.md`](../../vdp/docs/development/e2e-coverage-matrix.md):

Формат **h1–h3, p only** (DOC conventions). Для каждой роли/journey указать:

- Unit test file(s)
- API-e2e (compose-e2e section)
- UI-e2e (Playwright spec)
- Explicit «not covered in E2E — unit only»

~50 statuses: большинство **unit only** — honesty.

### 4. RD11 cross-reference

В [`rd11_playwright_e2e.plan.md`](rd11_playwright_e2e.plan.md) добавить note: «Expansion scope → RH2» (при исполнении RH2, не менять todos RD11 на completed retroactively unless work done).

### 5. Known-gaps update

Playwright пункт: «partial → expanded per RH2 matrix; not full role×status».

## Verify

```sh
cd vdp && make compose-up
cd vdp && ./scripts/compose-e2e.sh
cd vdp && make playwright-e2e
cd vdp/fe && npm test   # unit unchanged
```

CI: integration + playwright jobs green.

## DoD

- [ ] compose-e2e: ICO + reject + refund full sections green
- [ ] ≥2 new Playwright specs green
- [ ] e2e-coverage-matrix.md published
- [ ] known-gaps E2E sections updated
- [ ] No claim «full matrix covered» in docs

## Honesty note

После RH2: **критичные journeys** (happy, reject, refund, provider ACL, bank, ICO) — E2E. **Treasurer, Diadoc, shipment corrections, all cancel variants** — unit + matrix «not E2E». ~50 statuses remain mostly unit-tested.

## Источники истины

- [`vdp/fe/src/lib/ved/actions.ts`](../../vdp/fe/src/lib/ved/actions.ts) — CTA matrix
- [`vdp/core/internal/domain/formpayment/status.go`](../../vdp/core/internal/domain/formpayment/status.go) — status enum
- [`vdp/fe/e2e/fixtures/auth.fixture.ts`](../../vdp/fe/e2e/fixtures/auth.fixture.ts)
