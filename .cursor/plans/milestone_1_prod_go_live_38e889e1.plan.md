---
name: Milestone 1 Prod Go Live
overview: "Критерии закрытия prod-ready импорт пилота 95%+: Phase 1-4 done, release-gate, handover secrets, customer acceptance."
todos:
  - id: m1-precheck
    content: Verify Phase 1-4 completed + checklists signed
    status: completed
  - id: m1-release-gate
    content: make release-gate green
    status: completed
  - id: m1-handover-secrets
    content: handover-secrets-checklist closed
    status: completed
  - id: m1-bootstrap-oncall
    content: Prod/alpha bootstrap + on-call transfer
    status: completed
  - id: m1-docs-notify
    content: readiness prod score sync + notify-mgmt done
    status: completed
isProject: false
---

# Milestone 1: Production Go-Live (Import Pilot 95%+)

## Цель

Закрыть prod go-live для **импортного** пилота после Phase 1–4. Не требует Phase 5–8.

## Preconditions (все must)

| Phase | Plan | Status needed |
|---|---|---|
| 1 Docs honesty | phase_1_docs_honesty / import_docs_honesty_sync | completed |
| 2 Security | phase_2_security_hardening | completed + checklist signed |
| 3 Staging | phase_3_staging_readiness | smoke green |
| 4 Ops | phase_4_ops_excellence | alerts + runbook dry-run |

## Gate checklist

1. `make check-env-parity` затем **`make release-gate`** из `vdp/` (явный handover gate)
2. [`security-signoff-checklist.md`](vdp/docs/operations/security-signoff-checklist.md) — все выполнено + подпись
3. [`handover-secrets-checklist.md`](vdp/docs/operations/handover-secrets-checklist.md) закрыт
4. Production/alpha env bootstrapped (bootstrap-host + non-dev secrets)
5. On-call procedures transferred
6. [`readiness-and-limits.md`](vdp/docs/pilot/readiness-and-limits.md): prod go-live оценка обновлена evidence-based (не выше факта)
7. `notify-mgmt` kind=`done` продуктовым языком (один раз на milestone)

## Не входит

- Export / refunds / full logistics product
- 100% Nest parity / analytics / own OCR PRIMARY
- Full browser all roles × statuses

## DoD

Заказчик может принимать UAT/prod traffic на импортных маршрутах при принятых known-gaps.

## Rules

`vdp-ci-local-gate` (release-gate), `mgmt-tg-notify`, `честность-готовности`, `развертывание-и-доставка`.
