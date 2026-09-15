---
name: Phase 3 Staging Readiness
overview: Staging с реальными vendor URL (DOCS/MAIL/Diadoc), зелёный staging-smoke, hardening deploy/rollback. После Phase 2 secrets. Срок 2-3 рабочих дня по ритму 3.8 todo/ч.
todos:
  - id: stg-env-vendors
    content: "Staging env: DOCS_URL MAIL_URL (+ Diadoc/SMS/OCR по scope)"
    status: pending
  - id: stg-smoke-green
    content: staging-smoke.sh green против live staging
    status: pending
  - id: stg-rollback
    content: Deploy + rollback rehearsal на staging/alpha
    status: pending
  - id: stg-docs-gaps
    content: "Обновить staging-checklist / known-gaps: live vs fixture"
    status: pending
  - id: stg-security-integrations
    content: Отметить Integrations в security-signoff после smoke
    status: pending
isProject: false
---

# Phase 3: Staging Readiness

## Цель и оценка

**Цель:** staging/UAT с live integrations, не только compose stubs.  
**Срок:** 2–3 рабочих дня (~18–24 ч).  
**Базис:** ~15 todos × 3.8 todo/ч + ожидание vendor/ops.  
**Зависит от:** Phase 2 (prod-like secrets / env guards).

## Исходные артефакты

- [`vdp/docs/operations/staging-checklist.md`](vdp/docs/operations/staging-checklist.md)
- [`vdp/scripts/staging-smoke.sh`](vdp/scripts/staging-smoke.sh)
- [`vdp/docs/operations/staging-env.example`](vdp/docs/operations/staging-env.example) (или рядом)
- [`vdp/docs/operations/deploy-rollback.md`](vdp/docs/operations/deploy-rollback.md)

## Работы

### 1. Vendor env на staging (6–8 ч)

Выставить и проверить (не в git):

- `DOCS_URL` — реальный docs service (не stub.pdf)
- `MAIL_URL` / mail-gateway SMTP или HTTP provider
- `DIADOC_URL` — если в scope пилота; иначе явно «manual path only» в gaps
- Опционально: `SMS_URL`, `ONEC_URL`, `BANK_WEBHOOK_URL`, `OCR_URL` + Yandex keys

DoD куска: env заполнен по staging-checklist; dev defaults JWT/HUB отвергнуты (Phase 2).

### 2. staging-smoke green (4–6 ч)

Прогон [`staging-smoke.sh`](vdp/scripts/staging-smoke.sh) против staging host:

- health DOCS/MAIL (+ SMS если включён)
- probe generate / notify без 5xx
- зафиксировать failures → fix adapter или config

### 3. Deploy / rollback rehearsal (4–6 ч)

- Digest promote на alpha/staging per [`vdp-deploy.yml`](../.github/workflows/vdp-deploy.yml)
- Откат по [`deploy-rollback.md`](vdp/docs/operations/deploy-rollback.md) один раз на стенде
- Partial CD: что ещё не bootstrap — одна фраза в known-gaps, не silent

### 4. Docs honesty staging (2–3 ч)

- Обновить [`known-gaps.md`](vdp/docs/pilot/known-gaps.md) / staging-checklist статусы: что live, что всё ещё fixture
- Не обещать Diadoc/1C/Bank 100% без URL

## DoD / Gate

1. `staging-smoke.sh` green с реальными DOCS_URL + MAIL_URL
2. Rollback rehearsal documented (дата + результат)
3. Security checklist пункты Integrations (staging smoke) → выполнено
4. Gaps честно отражают остаток vendor

## Сверка с rules

- `развертывание-и-доставка` — промоут артефакта, rollback
- `устойчивость-и-наблюдаемость` — деградация при падении vendor
- `честность-готовности` — green smoke ≠ «все вендоры готовы»
- Gate: smoke + docs; полный `release-gate` — на Milestone 1

## Связь

- Блокирует Phase 4 (alerts на live) и Milestone 1
- Не трогает export/refunds product scope
