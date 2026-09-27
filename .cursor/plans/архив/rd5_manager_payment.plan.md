---
name: RD5 Manager Payment
overview: "Отладка Manager: assign provider, payment flow, refund panel + cancel-with-unrefunded 409."
todos:
  - id: rd5-provider-payment
    content: Assign provider + payment_start → processing → sent path prep
    status: completed
  - id: rd5-refund
    content: Refund init/start/file/sent; cancel 409 smoke
    status: completed
isProject: false
---

# RD5 — Manager: payment & refund

## Meta
- **ID:** RD5 · **Группа:** Операции · **Зависимости:** RD4 · **Оценка:** 0.5–1 день
- **Login:** `manager@vdp.local` / `manager`

## Scope
**In:** provider assign, payment received/start, refund; gating provider before payment_start.
**Out:** report/close (RD6); Provider UI (RD7 — после RD5).

## Rules gate
use-cases, идемпотентность денег, безопасность, ui-web (irreversible confirms).

## UI checklist
- [ ] payment_received: assign provider, deadline, payment_start
- [ ] Provider assigned до payment_start (UI gating)
- [ ] Refund: init → start → file → sent ([refund.ts](../vdp/fe/src/lib/api/refund.ts), [RefundPanel.tsx](../vdp/fe/src/components/ved/RefundPanel.tsx))
- [ ] manager_checking после provider return

## API verify
compose-e2e payment steps + refund smoke (second form, lines 79+); cancel with unrefunded → 409.

## Fix zones
RefundPanel, action-bridge refund/payment, form-assignments provider

## DoD
- [ ] Payment path до передачи провайдеру
- [ ] Refund smoke + 409 invariant

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| manager | … | … | … | … | … | … | … |
