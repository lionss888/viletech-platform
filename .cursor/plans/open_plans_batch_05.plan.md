---
name: Open plans batch 05
overview: "Triage package 5/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-rfc_w6_verify_dod
    content: "Triage rfc_w6_verify_dod.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rh0_ci_pipeline
    content: "Triage rh0_ci_pipeline.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rh1_postgres_integration
    content: "Triage rh1_postgres_integration.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rh2_e2e_coverage
    content: "Triage rh2_e2e_coverage.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rh3_staging_adapters
    content: "Triage rh3_staging_adapters.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rh4_release_gate
    content: "Triage rh4_release_gate.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rw0_terminology_foundation
    content: "Triage rw0_terminology_foundation.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-uat_w2_parties_hygiene
    content: "Triage uat_w2_parties_hygiene.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-uat_w3_no_docs_invoice_gate
    content: "Triage uat_w3_no_docs_invoice_gate.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-uat_w4_card_field_labels
    content: "Triage uat_w4_card_field_labels.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
isProject: false---

# Open plans batch 05

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `rfc_w6_verify_dod.plan.md`
2. `rh0_ci_pipeline.plan.md`
3. `rh1_postgres_integration.plan.md`
4. `rh2_e2e_coverage.plan.md`
5. `rh3_staging_adapters.plan.md`
6. `rh4_release_gate.plan.md`
7. `rw0_terminology_foundation.plan.md`
8. `uat_w2_parties_hygiene.plan.md`
9. `uat_w3_no_docs_invoice_gate.plan.md`
10. `uat_w4_card_field_labels.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan


## Triage decisions (2026-09-24)

- OCR / RH / precommit / uat_w6 / ocr_feedback: closed via unified pipeline phases 1–2 (status-sync or product execute).
- Remaining catalog plans: necessity confirmed as real backlog — leave open todos in **source** plans; no execute/rollback this wave; triage closed as decision recorded.
