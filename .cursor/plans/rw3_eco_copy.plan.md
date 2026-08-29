---
name: RW3 ECO Copy
overview: "Копирайт внешнего комплаенса (ECO): очередь сделки, accept/reject/corrections. Root не трогаем."
todos:
  - id: rw3-nav-focus
    content: ROLE_FOCUS + nav ECO
    status: pending
  - id: rw3-cta-status
    content: Labels eco_form_* / form_verification*
    status: pending
  - id: rw3-reject-path
    content: Copy reject → corrections → resubmit (понятно ECO и User)
    status: pending
  - id: rw3-gate
    content: "DoD: ECO voice; root не тронут"
    status: pending
isProject: false
---

# RW3 — External CO (ECO) copy

## Meta
- **ID:** RW3 · **Группа:** Комплаенс · **Зависимости:** RW2 · **Оценка:** 0.5 дня
- **Login:** `eco@vdp.local` / `eco`

## Scope
**In:** ECO labels для form_waiting_verification / form_verification / accept/reject/stop/cancel.
**Out:** root; ICO-only org screens; RD3 functional fixes.

## Rules gate
ui-web-практики, use-cases, безопасность-ролей-и-данных, поддержка-и-обратная-связь.

## UI checklist (copy)
- [ ] ROLE_FOCUS compliance_officer
- [ ] CTA eco_form_* — «условия сделки / проверка документов»
- [ ] Reject reason/mark prompts — ясный next step для User
- [ ] **Root UI без изменений**

## Fix zones
copy/*, actions.ts labels, SubjectReview (ECO path), forms-list/detail subtitles

## DoD
- [ ] ECO voice согласован с глоссарием
- [ ] Root не тронут
