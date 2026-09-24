---
name: Open plans batch 06
overview: "Triage package 6/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-uat_w5_root_cancel
    content: "Triage uat_w5_root_cancel.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-uat_w6_role_cabinets_browser
    content: "Triage uat_w6_role_cabinets_browser.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-uat_w7_browser_ladders_return
    content: "Triage uat_w7_browser_ladders_return.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_c1_create_ocr_copy
    content: "Triage ux_c1_create_ocr_copy.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_c2_document_view
    content: "Triage ux_c2_document_view.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_c3_manager_hide_drafts
    content: "Triage ux_c3_manager_hide_drafts.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_c4_timeline_labels
    content: "Triage ux_c4_timeline_labels.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_c5_manager_org_waiting
    content: "Triage ux_c5_manager_org_waiting.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_t_form_flow_tests
    content: "Triage ux_t_form_flow_tests.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ux_v_verify_gate
    content: "Triage ux_v_verify_gate.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
isProject: false
---

# Open plans batch 06

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `uat_w5_root_cancel.plan.md`
2. `uat_w6_role_cabinets_browser.plan.md`
3. `uat_w7_browser_ladders_return.plan.md`
4. `ux_c1_create_ocr_copy.plan.md`
5. `ux_c2_document_view.plan.md`
6. `ux_c3_manager_hide_drafts.plan.md`
7. `ux_c4_timeline_labels.plan.md`
8. `ux_c5_manager_org_waiting.plan.md`
9. `ux_t_form_flow_tests.plan.md`
10. `ux_v_verify_gate.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan
