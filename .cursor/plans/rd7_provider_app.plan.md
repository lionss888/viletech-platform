---
name: RD7 Provider App
overview: "Отладка Provider: ACL без ПДн, payment start/sent/return, attach proof."
todos:
  - id: rd7-acl
    content: Реестр/карточка без Клиент/ПДн
    status: completed
  - id: rd7-payment
    content: prov_payment_start/sent/return + attach proof
    status: completed
isProject: false
---

# RD7 — Provider (app)

## Meta
- **ID:** RD7 · **Группа:** Сервис · **Зависимости:** RD5 · **Оценка:** 0.5 дня
- **Login:** `provider@vdp.local` / `provider`
- **Need:** заявка в payment_processing / payment_received

## Scope
**In:** Provider UI ACL + payment actions.
**Out:** root; показ ПДн; demo.

## Rules gate
безопасность-ролей-и-данных (жёстко), use-cases, solid Provider DTO.

## UI checklist
- [ ] Реестр: **нет** колонки «Клиент»
- [ ] Карточка: реквизиты без ownerName/ПДн ([form-detail-page.tsx](../vdp/fe/src/components/ved/pages/form-detail-page.tsx))
- [ ] prov_payment_start / prov_payment_sent / attach proof
- [ ] prov_payment_return → manager_checking

## API verify
compose-e2e provider payment/sent; PROVIDER_HIDDEN_FIELDS / core AuthZ.

## Fix zones
form-detail provider branch, forms-list columns, action-bridge provider

## DoD
- [ ] ACL проверен; payment sent через UI
- [ ] Нет ПДн в UI

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| provider | … | … | … | … | … | … | … |
