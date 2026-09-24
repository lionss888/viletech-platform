---
name: Open plans batch 07
overview: "Triage package 7/7 of open catalog plans; follow unified_backlog_pipeline_70ee04a1.plan.md; no product rollback; execute product only in source plans."
todos:
  - id: triage-vdp_blockers_and_deploy_99106aff
    content: "Triage vdp_blockers_and_deploy_99106aff.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vdp_documentation_program_7809e01f
    content: "Triage vdp_documentation_program_7809e01f.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vdp_prod_readiness_master_89fa45e7
    content: "Triage vdp_prod_readiness_master_89fa45e7.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vdp_roadmap_r0-r12_b92091dd
    content: "Triage vdp_roadmap_r0-r12_b92091dd.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vdp_role_debug_master
    content: "Triage vdp_role_debug_master.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_audiences_qg_10445819
    content: "Triage vedy_bot_audiences_qg_10445819.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_p0_agent_cloud
    content: "Triage vedy_bot_p0_agent_cloud.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_p1_knowledge_rag
    content: "Triage vedy_bot_p1_knowledge_rag.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_p2_tg_cursor_auto
    content: "Triage vedy_bot_p2_tg_cursor_auto.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_p3_hitl_cursor_primary
    content: "Triage vedy_bot_p3_hitl_cursor_primary.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_p4_local_cursor_agent
    content: "Triage vedy_bot_p4_local_cursor_agent.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-vedy_bot_p5_alpha_stand_tests
    content: "Triage vedy_bot_p5_alpha_stand_tests.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
  - id: triage-xxxxxxxx_xxx_xxxxxxxxx_e874f6dc
    content: "Triage карточка_без_прочерков_e874f6dc.plan.md: necessity → status-sync / execute in source plan / cancelled+reason; no vdp/** rollback"
    status: completed
isProject: false---

# Open plans batch 07

Orchestrator: [unified_backlog_pipeline_70ee04a1.plan.md](unified_backlog_pipeline_70ee04a1.plan.md).

## Template

Each todo: check whether open todos in the source plan are still needed → status-sync if code exists / execute in the **source** plan if real work remains / cancelled with reason if obsolete. Do not rollback `vdp/**`. Do not duplicate Lane C product scope here.

## Rules

`планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate` (only if triage decides execute product), `правила-построения`.

## Plans in this batch

1. `vdp_blockers_and_deploy_99106aff.plan.md`
2. `vdp_documentation_program_7809e01f.plan.md`
3. `vdp_prod_readiness_master_89fa45e7.plan.md`
4. `vdp_roadmap_r0-r12_b92091dd.plan.md`
5. `vdp_role_debug_master.plan.md`
6. `vedy_bot_audiences_qg_10445819.plan.md`
7. `vedy_bot_p0_agent_cloud.plan.md`
8. `vedy_bot_p1_knowledge_rag.plan.md`
9. `vedy_bot_p2_tg_cursor_auto.plan.md`
10. `vedy_bot_p3_hitl_cursor_primary.plan.md`
11. `vedy_bot_p4_local_cursor_agent.plan.md`
12. `vedy_bot_p5_alpha_stand_tests.plan.md`
13. `карточка_без_прочерков_e874f6dc.plan.md`

## DoD

- [ ] All triage todos closed with a decision (completed / cancelled + reason)
- [ ] Product CI only when triage = execute in source plan


## Triage decisions (2026-09-24)

- OCR / RH / precommit / uat_w6 / ocr_feedback: closed via unified pipeline phases 1–2 (status-sync or product execute).
- Remaining catalog plans: necessity confirmed as real backlog — leave open todos in **source** plans; no execute/rollback this wave; triage closed as decision recorded.
