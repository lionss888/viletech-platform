---
name: RD6 Manager Close
overview: "Отладка Manager: report signing, shipment, mgr_completed → completed."
todos:
  - id: rd6-report
    content: payment_sent → report signing → accept
    status: completed
  - id: rd6-shipment-close
    content: shipment waiting/verify → mgr_completed → completed
    status: completed
isProject: false
---

# RD6 — Manager: report & close

## Meta
- **ID:** RD6 · **Группа:** Операции · **Зависимости:** RD5 · **Оценка:** 0.5 дня
- **Login:** `manager@vdp.local` / `manager`

## Scope
**In:** report + shipment + completed на той же заявке.
**Out:** Provider ACL (RD7); refund (RD5).

## Rules gate
use-cases, ui-web (ясный финал), интеграция-и-события.

## UI checklist
- [ ] payment_sent → report signing → User upload report
- [ ] report_accepted → mgr_shipment_waiting
- [ ] Shipment verify → mgr_completed → completed
- [ ] Dashboard: stuck count не растёт после close

## API verify
compose-e2e report + completed (~67–69).

## Fix zones
action-bridge report/shipment/completed, ActionPanel

## DoD
- [ ] Status `completed` на той же form id

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| manager | … | … | … | … | … | … | … |
