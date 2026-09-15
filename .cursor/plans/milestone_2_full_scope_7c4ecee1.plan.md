---
name: Milestone 2 Full Scope
overview: "Критерии 100% scope вводных после Phase 5-8: export+refunds+shipment ветка, тесты, docs, §9 sync."
todos:
  - id: m2-precheck
    content: Verify Phase 5-8 DoD closed
    status: pending
  - id: m2-gate
    content: ci-pr-pilot + export/refund/shipment regress
    status: pending
  - id: m2-vvodnye
    content: §9 вводных sync галочки vs gaps
    status: pending
  - id: m2-docs
    content: readiness/known-gaps full-scope honesty
    status: pending
  - id: m2-notify
    content: notify-mgmt done Milestone 2
    status: pending
isProject: false
---

# Milestone 2: Full Scope вводных (100% in-scope)

## Цель

Закрыть **in-scope** требования вводных по маршрутам после Phase 5–8. Не путать с бесконечным roadmap (analytics, full logistics product, Nest migration).

## Preconditions

- Milestone 1 done (или явный waiver заказчика на prod-without-export)
- Phase 5 Export domain completed
- Phase 6 Export UI/E2E completed
- Phase 7 Refunds completed (§9 refund checkbox)
- Phase 8 Shipment branch completed (не «логисты как продукт»)

## Verification matrix

| Маршрут | Domain/API | FE | E2E/compose |
|---|---|---|---|
| Import advance | IMP | yes | pilot-matrix |
| Import RATE_ON_PP | IMP | yes | pilot-matrix |
| Export + PAY_FROM_EXPORT | P5 | P6 | P6 |
| Refunds | P7 | P7 | P7 |
| Shipment branch | P8 | P8 | P8 |

## Gate

1. Targeted: `go test` IMP + export + refund; FE unit; `make ci-pr-pilot`
2. §9 вводных: закрытые `[x]` только на факт; открытые out-of-scope явно
3. readiness: full-scope % sync; known-gaps остаток (bank depth, PDF pixel, analytics placeholders)
4. Один `notify-mgmt` done на milestone

## Вне «100%» (остаётся gaps)

Logistics-as-product, POSTPAY_FIXED_RATE, Nest data migration, analytics/assistant, own OCR PRIMARY, full matrix all statuses.

## DoD

Честный claim: in-scope маршруты вводных покрыты domain→E2E; residual gaps listed.

## Rules

`честность-готовности`, `планирование-сверка-с-rules`, `vdp-ci-local-gate`, `mgmt-tg-notify`.
