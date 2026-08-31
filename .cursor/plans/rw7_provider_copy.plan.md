---
name: RW7 Provider Copy
overview: "Копирайт Provider: исполнение платежа, подтверждения, без ПДн и без «Клиент». Root не трогаем."
todos:
  - id: rw7-acl-copy
    content: Убрать/не вводить copy с ПДн и колонкой Клиент
    status: completed
  - id: rw7-payment-cta
    content: Labels prov_payment_* / attach proof
    status: completed
  - id: rw7-gate
    content: "DoD: provider voice + ACL copy; root не тронут"
    status: completed
isProject: false
---

# RW7 — Provider copy

## Meta
- **ID:** RW7 · **Группа:** Сервис · **Зависимости:** RW0 (желательно после RW5) · **Оценка:** 0.5 дня
- **Login:** `provider@vdp.local` / `provider`

## Scope
**In:** ROLE_FOCUS, CTA prov_*, empty states, карточка без ownerName в тексте.
**Out:** root; показ ПДн; functional ACL bugs (RD7).

## Rules gate
безопасность-ролей-и-данных (жёстко), ui-web-практики, solid (узкий Provider DTO в copy).

## UI checklist (copy)
- [ ] Нет «Клиент» / ФИО / паспорт в labels и helper text
- [ ] prov_payment_start/sent/return, prov_attach_proof — реквизиты / подтверждение / хеш
- [ ] Return → manager_checking понятен без ПДн
- [ ] **Root UI без изменений**

## Fix zones
form-detail-page provider branch, forms-list columns, actions.ts provider labels, ROLE_FOCUS.provider

## DoD
- [ ] Provider copy без ПДн
- [ ] Root не тронут
