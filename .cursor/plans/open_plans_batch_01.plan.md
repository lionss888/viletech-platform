---
name: Open plans batch 01
overview: "Triage package 1/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-ap0_intake_harden
    content: "Triage ap0_intake_harden.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ap1_analytics_boundary
    content: "Triage ap1_analytics_boundary.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ap2a_console_operator
    content: "Triage ap2a_console_operator.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ap2b_operator_tg
    content: "Triage ap2b_operator_tg.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ap3_cursor_plan_parity
    content: "Triage ap3_cursor_plan_parity.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-ap4_selective_publish
    content: "Triage ap4_selective_publish.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-api_contract_a1_forms_yaml
    content: "Triage api_contract_a1_forms_yaml.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-api_contract_a2_schema_helper
    content: "Triage api_contract_a2_schema_helper.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-api_contract_a3_httptest
    content: "Triage api_contract_a3_httptest.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
  - id: triage-api_contract_a4_docs_qg
    content: "Triage api_contract_a4_docs_qg.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: pending
isProject: false
---

# Open plans batch 01

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `ap0_intake_harden.plan.md`
2. `ap1_analytics_boundary.plan.md`
3. `ap2a_console_operator.plan.md`
4. `ap2b_operator_tg.plan.md`
5. `ap3_cursor_plan_parity.plan.md`
6. `ap4_selective_publish.plan.md`
7. `api_contract_a1_forms_yaml.plan.md`
8. `api_contract_a2_schema_helper.plan.md`
9. `api_contract_a3_httptest.plan.md`
10. `api_contract_a4_docs_qg.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan
