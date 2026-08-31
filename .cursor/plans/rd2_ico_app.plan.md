---
name: RD2 ICO App
overview: "Отладка Internal CO: org approve, ICO form start/accept/reject, compliance gating orgBlocksApproval."
todos:
  - id: rd2-org
    content: /organizations approve pending org
    status: completed
  - id: rd2-form-flow
    content: ico_form_start → accept / reject path
    status: completed
  - id: rd2-gating
    content: orgBlocksApproval lock на карточке
    status: completed
isProject: false
---

# RD2 — Internal CO (ICO)

## Meta
- **ID:** RD2 · **Группа:** Комплаенс · **Зависимости:** RD1 · **Оценка:** 0.5–1 день
- **Login:** `ico@vdp.local` / `ico`

## Scope
**In:** org + ICO form flow в app.
**Out:** ECO (RD3); demo; root.

## Rules gate
use-cases, безопасность-ролей-и-данных, compliance.ts policy, ui-web-практики.

## UI checklist
- [ ] Nav: «Входящие заявки», «Проверка организаций»
- [ ] `/organizations` — approve org
- [ ] SubjectReview + orgBlocksApproval ([compliance.ts](../vdp/fe/src/lib/ved/compliance.ts))
- [ ] ico_form_start → ico_form_accept / reject (reason+mark)
- [ ] Reject → User видит form_waiting_corrections

## API verify
compose-e2e.sh steps org approve + ICO start/accept (~lines 47–49).

## Fix zones
SubjectReview.tsx, catalog-mutations org, action-bridge ICO, ActionPanel

## DoD
- [ ] Заявка → `form_waiting_verification`
- [ ] Gating org block работает

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| ico | … | … | … | … | … | … | … |
