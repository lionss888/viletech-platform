---
name: Phase 1 Docs Honesty
overview: "Quick win: синхронизация pilot/domain docs с IMP7/IMP8 @pilot-matrix и честный bump пилота до ~90%. Работа уже выполнена планом import_docs_honesty_sync — этот файл фиксирует Phase 1 в серии master."
todos:
  - id: p1-link-master
    content: В master отметить phase1-docs-honesty completed + ссылка на этот план
    status: completed
  - id: p1-archive-note
    content: Не переоткрывать import_docs_honesty_sync — Phase 1 закрыта
    status: completed
isProject: false
---

# Phase 1: Docs Honesty Sync

## Статус

**Уже выполнено** через [`import_docs_honesty_sync_3d8a9c27.plan.md`](import_docs_honesty_sync_3d8a9c27.plan.md) (все todos completed, включая `docs-format-check` и `notify-mgmt`).

Этот план — каноническая запись Phase 1 в серии [`vdp_prod_readiness_master`](vdp_prod_readiness_master_89fa45e7.plan.md), чтобы не было дыры между master и Phase 2.

## Цель и оценка

**Цель:** поднять честную оценку пилота с ~88% до ~90% без изменения кода маршрутов.  
**Срок по ритму:** 4–6 часов (~5 todos × 3.8 todo/ч + format gate).  
**Факт:** закрыто до старта Phase 2.

## Почему это было нужно

Код опережал docs:

- [`pilot-matrix-full-ladder.spec.ts`](vdp/fe/e2e/pilot-matrix-full-ladder.spec.ts) — IMP7 advance treasurer + `execution_deadline`
- [`pilot-matrix-postpay-rate.spec.ts`](vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts) — IMP8 POSTPAY_RATE_ON_PP до completed

Docs всё ещё отрицали postpay browser / «сквозной Playwright аванса и постоплаты» → заниженный % и расхождение «план/код vs честность docs».

## Что сделано (evidence)

| Файл | Изменение |
|---|---|
| [`vdp/docs/pilot/readiness-and-limits.md`](vdp/docs/pilot/readiness-and-limits.md) | ~90%; claims IMP7+IMP8; убраны устаревшие cannot-promise |
| [`vdp/docs/pilot/known-gaps.md`](vdp/docs/pilot/known-gaps.md) | дата/scope; postpay `@pilot-matrix` заявлен |
| [`vdp/docs/domain/form-lifecycle.md`](vdp/docs/domain/form-lifecycle.md) | покрытие IMP8 вместо «E2E не заявлен» |
| [`vdp/docs/development/e2e-coverage-matrix.md`](vdp/docs/development/e2e-coverage-matrix.md) | rows advance/postpay |
| [`vdp/docs/pilot/scenario-role-directory.md`](vdp/docs/pilot/scenario-role-directory.md) | treasurer в pilot-matrix |
| stale child plans (imp8) | todos закрыты |

## Что остаётся gaps (не раздувать %)

- полный wizard `payment_method:advance` E2E
- import journeys не в обязательном PR smoke
- customer robot fixture pack
- `POSTPAY_FIXED_RATE`
- prod/staging vendor (Phase 2–4)

## DoD (закрыт)

1. Claims = код для IMP7/IMP8 browser
2. Пилот ~90% с опорой на specs
3. `make docs-format-check` green
4. mgmt notify `done` отправлен

## Сверка с rules

- `честность-готовности` — % только после claims = код
- `vdp-ci-local-gate` — для docs: `docs-format-check`
- `mgmt-tg-notify` — один `done` после волны
- Вне scope: FE/Go, AuthZ, staging, ML

## Связь с master

- **Следующая:** Phase 2 Security Hardening
- **Не блокирует** Phase 2 по коду; master todo `phase1-docs-honesty` → completed
