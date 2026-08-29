---
name: RW5 Manager Copy Payment
overview: "Копирайт Manager: провайдер, платёж, возврат ДС. Root не трогаем. Сверка с ЦБ-лексикой где уместно."
todos:
  - id: rw5-payment
    content: Labels payment_* / mgr_payment_* / mgr_assign_provider
    status: pending
  - id: rw5-refund
    content: RefundPanel + mgr_refund_* copy
    status: pending
  - id: rw5-gate
    content: "DoD: payment+refund voice; root не тронут"
    status: pending
isProject: false
---

# RW5 — Manager copy: payment & refund

## Meta
- **ID:** RW5 · **Группа:** Операции · **Зависимости:** RW4 · **Оценка:** 0.5 дня

## Scope
**In:** payment_received → payment_sent, manager_checking, refund_* labels; RefundPanel.
**Out:** report/shipment (RW6); provider voice (RW7); root; bank badge (RW8).

## Rules gate
ui-web-практики, устойчивость (ясность irreversible), istochniki ЦБ.

## UI checklist (copy)
- [ ] mgr_assign_provider, deadline, payment_start/received
- [ ] mgr_refund_init/start/file/sent/stop/cancel — «возврат ДС»
- [ ] Status payment_* / payment_refund_*
- [ ] Confirm texts с суммой/целью где есть в UI
- [ ] **Root UI без изменений**

## Fix zones
actions.ts, statuses.ts, RefundPanel.tsx, ActionPanel

## DoD
- [ ] Payment/refund copy согласован
- [ ] Root не тронут
