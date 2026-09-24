---
name: Open plans batch 04
overview: "Triage package 4/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-return_after_execution_1_fact
    content: "Triage return_after_execution_1_fact.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-return_after_execution_2_clarify
    content: "Triage return_after_execution_2_clarify.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-return_after_execution_3_return_client
    content: "Triage return_after_execution_3_return_client.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-return_after_execution_4_repeat
    content: "Triage return_after_execution_4_repeat.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-return_after_execution_5_e2e_journeys
    content: "Triage return_after_execution_5_e2e_journeys.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rfc_w1_domain_mandatory
    content: "Triage rfc_w1_domain_mandatory.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rfc_w2_persist_api
    content: "Triage rfc_w2_persist_api.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rfc_w3_continuity_spine
    content: "Triage rfc_w3_continuity_spine.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rfc_w4_process_roles_ux
    content: "Triage rfc_w4_process_roles_ux.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-rfc_w5_admin_user_form
    content: "Triage rfc_w5_admin_user_form.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
isProject: false---

# Open plans batch 04

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `return_after_execution_1_fact.plan.md`
2. `return_after_execution_2_clarify.plan.md`
3. `return_after_execution_3_return_client.plan.md`
4. `return_after_execution_4_repeat.plan.md`
5. `return_after_execution_5_e2e_journeys.plan.md`
6. `rfc_w1_domain_mandatory.plan.md`
7. `rfc_w2_persist_api.plan.md`
8. `rfc_w3_continuity_spine.plan.md`
9. `rfc_w4_process_roles_ux.plan.md`
10. `rfc_w5_admin_user_form.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan


## Triage decisions (2026-09-24)

- OCR / RH / precommit / uat_w6 / ocr_feedback: closed via unified pipeline phases 1–2 (status-sync or product execute).
- Remaining catalog plans: necessity confirmed as real backlog — leave open todos in **source** plans; no execute/rollback this wave; triage closed as decision recorded.
