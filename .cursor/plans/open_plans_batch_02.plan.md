---
name: Open plans batch 02
overview: "Triage package 2/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-api_contract_b1_golden
    content: "Triage api_contract_b1_golden.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-api_contract_b2_vitest
    content: "Triage api_contract_b2_vitest.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-api_contract_b3_docs_qg
    content: "Triage api_contract_b3_docs_qg.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-api_contract_lean_master
    content: "Triage api_contract_lean_master.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-ci_situation_analytics_6f54693b
    content: "Triage ci_situation_analytics_6f54693b.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-demo_document_ocr_47af6bf7
    content: "Triage demo_document_ocr_47af6bf7.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-in0_intake_transport_da671411
    content: "Triage in0_intake_transport_da671411.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-intake_ollama_dialogue_3acea8a9
    content: "Triage intake_ollama_dialogue_3acea8a9.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-integrity_full_scope_series_c3883655
    content: "Triage integrity_full_scope_series_c3883655.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-milestone_2_full_scope_7c4ecee1
    content: "Triage milestone_2_full_scope_7c4ecee1.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
isProject: false---

# Open plans batch 02

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `api_contract_b1_golden.plan.md`
2. `api_contract_b2_vitest.plan.md`
3. `api_contract_b3_docs_qg.plan.md`
4. `api_contract_lean_master.plan.md`
5. `ci_situation_analytics_6f54693b.plan.md`
6. `demo_document_ocr_47af6bf7.plan.md`
7. `in0_intake_transport_da671411.plan.md`
8. `intake_ollama_dialogue_3acea8a9.plan.md`
9. `integrity_full_scope_series_c3883655.plan.md`
10. `milestone_2_full_scope_7c4ecee1.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan


## Triage decisions (2026-09-24)

- OCR / RH / precommit / uat_w6 / ocr_feedback: closed via unified pipeline phases 1–2 (status-sync or product execute).
- Remaining catalog plans: necessity confirmed as real backlog — leave open todos in **source** plans; no execute/rollback this wave; triage closed as decision recorded.
