---
name: RW4 Manager Copy Contract
overview: "Копирайт Manager: агент, договор, поручение принципала. Root не трогаем."
todos:
  - id: rw4-agent-contract
    content: Labels mgr_assign_agent, mgr_contract_*, contract_* statuses
    status: pending
  - id: rw4-order
    content: Labels mgr_order_* / signing_order* (принципал / поручение)
    status: pending
  - id: rw4-gate
    content: "DoD: contract+order voice; root не тронут"
    status: pending
isProject: false
---

# RW4 — Manager copy: contract & order

## Meta
- **ID:** RW4 · **Группа:** Операции · **Зависимости:** RW3 · **Оценка:** 0.5 дня
- **Login:** `manager@vdp.local` / `manager`

## Scope
**In:** labels form_accepted → signing_order_accepted (агент, договор, поручение).
**Out:** payment/refund (RW5); close (RW6); root.

## Rules gate
ui-web-практики, use-cases, terminologiya-ved (агент/комиссия/поручение).

## UI checklist (copy)
- [ ] mgr_assign_agent → «Назначить агента по сделке» (или финал из глоссария)
- [ ] mgr_contract_attach/confirm/return; mgr_order_generate/attach/start/accept/reject
- [ ] Status labels contract_* / signing_order*
- [ ] Confirm dialogs irreversible
- [ ] **Root UI без изменений**

## Fix zones
actions.ts labels, statuses.ts, ActionPanel confirms, form-assignments UI strings

## DoD
- [ ] Contract/order ветка на операционном сленге
- [ ] Root не тронут
