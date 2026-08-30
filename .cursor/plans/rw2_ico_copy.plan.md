---
name: RW2 ICO Copy
overview: "Копирайт внутреннего комплаенса (ICO): очередь, организации, SubjectReview, CTA проверки. Root не трогаем."
todos:
  - id: rw2-nav-focus
    content: Nav + ROLE_FOCUS ICO (проверка организаций / входящие)
    status: completed
  - id: rw2-cta-status
    content: Labels ico_form_* и org verification statuses
    status: completed
  - id: rw2-subject-review
    content: SubjectReview / lockNote copy без ПДн-шума
    status: completed
  - id: rw2-gate
    content: "DoD: ICO voice; root не тронут"
    status: completed
isProject: false
---

# RW2 — Internal CO (ICO) copy

## Meta
- **ID:** RW2 · **Группа:** Комплаенс · **Зависимости:** RW0 (желательно RD2) · **Оценка:** 0.5 дня
- **Login:** `ico@vdp.local` / `ico`

## Scope
**In:** ICO labels (nav «Входящие», «Проверка организаций», CTA start/accept/reject/stop/cancel, org lock notes).
**Out:** root; ECO voice (RW3); functional bugs (RD2).

## Rules gate
ui-web-практики, безопасность-ролей-и-данных, use-cases, поддержка-и-обратная-связь.

## UI checklist (copy)
- [ ] ROLE_FOCUS internal_compliance_officer
- [ ] Статусы organization_* / form_waiting_corrections с точки зрения ICO
- [ ] CTA: ico_form_start/accept/reject/stop/cancel — «проверка / досье / соответствие»
- [ ] SubjectReview + orgBlocksApproval тексты
- [ ] **Root UI без изменений**

## Fix zones
copy/role-voice, actions.ts labels, SubjectReview.tsx, compliance.ts user-facing strings, organizations page

## DoD
- [ ] ICO кабинет на сленге внутренней проверки
- [ ] Root не тронут
