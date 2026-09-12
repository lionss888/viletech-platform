---
name: AP3 Cursor plan parity
overview: "planfile .plan.md frontmatter+todos как Cursor; GET/PUT /api/plans; React editor round-trip."
todos:
  - id: ap3-model
    content: PlanDoc parse/write YAML frontmatter + todos
    status: pending
  - id: ap3-api
    content: GET/PUT /api/plans + HITL пишет совместимый .plan.md
    status: pending
  - id: ap3-ui
    content: React todos editor + unit round-trip
    status: pending
isProject: false
---

# AP3 — Cursor `.plan.md` parity

**Родитель:** [`intake_applied_stages_5075cc20.plan.md`](intake_applied_stages_5075cc20.plan.md)

## Сверка с rules

**Обязательны:** `детали-как-плагины`, `go-testing`, `typescript-clean-code`, `честность-готовности`.
**Вне scope:** CreatePlan MCP; auto-run todos; subagents UI.

## DoD

- [ ] Валидный frontmatter+todos
- [ ] UI round-trip
- [ ] Unit parse/write
