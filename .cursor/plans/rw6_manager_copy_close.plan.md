---
name: RW6 Manager Copy Close
overview: "Копирайт Manager: отчёт агента, отгрузка, закрытие сделки. Root не трогаем."
todos:
  - id: rw6-report
    content: Labels report_* / mgr_report_*
    status: pending
  - id: rw6-shipment-close
    content: Labels shipment_* / mgr_shipment_* / mgr_completed
    status: pending
  - id: rw6-gate
    content: "DoD: close path voice; root не тронут"
    status: pending
isProject: false
---

# RW6 — Manager copy: report & close

## Meta
- **ID:** RW6 · **Группа:** Операции · **Зависимости:** RW5 · **Оценка:** 0.5 дня

## Scope
**In:** report_waiting → report_accepted → shipment_* → completed labels.
**Out:** root; payment (RW5); User upload labels (уже RW1, сверить согласованность).

## Rules gate
ui-web-практики, Goal-Gradient (ясный финал), terminologiya (отчёт агента / отгрузка).

## UI checklist (copy)
- [ ] mgr_report_signing/start/accept/reject
- [ ] mgr_shipment_waiting/start/reject; mgr_completed «Закрыть сделку/заявку»
- [ ] Status labels report_* / shipment_* / completed
- [ ] **Root UI без изменений**

## Fix zones
actions.ts, statuses.ts, dashboard counters labels (manager)

## DoD
- [ ] Close path на сленге операций
- [ ] Root не тронут
