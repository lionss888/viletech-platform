---
name: RD3 ECO App
overview: "Отладка External CO: eco start/accept → form_accepted; reject → corrections → User resubmit."
todos:
  - id: rd3-accept
    content: eco_form_start → eco_form_accept → form_accepted
    status: completed
  - id: rd3-reject
    content: Reject path → corrections → User resubmit
    status: completed
isProject: false
---

# RD3 — External CO (ECO)

## Meta
- **ID:** RD3 · **Группа:** Комплаенс · **Зависимости:** RD2 · **Оценка:** 0.5 дня
- **Login:** `eco@vdp.local` / `eco`

## Scope
**In:** ECO review queue и transitions.
**Out:** Manager; demo.

## Rules gate
use-cases, AuthZ ECO endpoints, ui-web-практики.

## UI checklist
- [ ] Очередь form_waiting_verification / form_verification
- [ ] eco_form_start → eco_form_accept → form_accepted
- [ ] Reject → form_waiting_corrections → User accept_corrections

## API verify
compose-e2e.sh ECO steps (~50–51).

## Fix zones
action-bridge ECO, SubjectReview, ActionPanel reason/mark

## DoD
- [ ] Happy path до form_accepted
- [ ] Reject path проверен

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| eco | … | … | … | … | … | … | … |
