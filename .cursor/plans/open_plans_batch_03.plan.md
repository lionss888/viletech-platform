---
name: Open plans batch 03
overview: "Triage package 3/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-nest_to_parity_rename_36a204c3
    content: "Triage nest_to_parity_rename_36a204c3.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-ocr_feedback_p0_132b4b56
    content: "Triage ocr_feedback_p0_132b4b56.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-ocr_path_xx_uat_382e6525
    content: "Triage ocr_path_до_uat_382e6525.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-ocr_uat_unblock_fb43d5c8
    content: "Triage ocr_uat_unblock_fb43d5c8.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-phase_5_export_domain_dffbc889
    content: "Triage phase_5_export_domain_dffbc889.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-phase_6_export_ui_e2e_22fcdbc8
    content: "Triage phase_6_export_ui_e2e_22fcdbc8.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-phase_7_refunds_system_87a207ef
    content: "Triage phase_7_refunds_system_87a207ef.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-phase_8_logistics_shipment_b7770f93
    content: "Triage phase_8_logistics_shipment_b7770f93.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-precommit_fe_unit_e03035eb
    content: "Triage precommit_fe_unit_e03035eb.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-return_after_execution_0_boundary
    content: "Triage return_after_execution_0_boundary.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
isProject: false---

# Open plans batch 03

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `nest_to_parity_rename_36a204c3.plan.md`
2. `ocr_feedback_p0_132b4b56.plan.md`
3. `ocr_path_до_uat_382e6525.plan.md`
4. `ocr_uat_unblock_fb43d5c8.plan.md`
5. `phase_5_export_domain_dffbc889.plan.md`
6. `phase_6_export_ui_e2e_22fcdbc8.plan.md`
7. `phase_7_refunds_system_87a207ef.plan.md`
8. `phase_8_logistics_shipment_b7770f93.plan.md`
9. `precommit_fe_unit_e03035eb.plan.md`
10. `return_after_execution_0_boundary.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan


## Triage decisions (2026-09-24)

- OCR / RH / precommit / uat_w6 / ocr_feedback: closed via unified pipeline phases 1–2 (status-sync or product execute).
- Remaining catalog plans: necessity confirmed as real backlog — leave open todos in **source** plans; no execute/rollback this wave; triage closed as decision recorded.
