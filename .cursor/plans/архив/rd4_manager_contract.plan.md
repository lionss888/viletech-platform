---
name: RD4 Manager Contract
overview: "Отладка Manager: agent, contract attach/confirm, order generate/verify до signing_order_accepted."
todos:
  - id: rd4-agent
    content: mgr_assign_agent + API form-assignments
    status: completed
  - id: rd4-contract
    content: Contract attach/confirm/return branch
    status: completed
  - id: rd4-order
    content: Order generate/attach/verify → signing_order_accepted
    status: completed
isProject: false
---

# RD4 — Manager: contract & order

## Meta
- **ID:** RD4 · **Группа:** Операции · **Зависимости:** RD3 · **Оценка:** 0.5–1 день
- **Login:** `manager@vdp.local` / `manager`
- **Start status:** form_accepted+

## Scope
**In:** agent, contract, order branch.
**Out:** payment/refund (RD5); close (RD6).

## Rules gate
use-cases, интеграция (contract API ≠ file-only), ui-web-практики.

## UI checklist
- [ ] mgr_assign_agent — modal + [form-assignments.ts](../vdp/fe/src/lib/api/form-assignments.ts)
- [ ] mgr_contract_attach — file + [contract.ts](../vdp/fe/src/lib/api/contract.ts)
- [ ] Contract: confirm / return / order generate / order attach
- [ ] Order verification: start → accept → signing_order_accepted
- [ ] User upload signed order

## API verify
compose-e2e agent + order steps (~55–63).

## Fix zones
action-bridge manager contract/order, ActionPanel, contract.ts

## DoD
- [ ] Status signing_order_accepted на заявке

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| manager | … | … | … | … | … | … | … |
