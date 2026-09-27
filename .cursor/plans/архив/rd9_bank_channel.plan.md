---
name: RD9 Bank Channel
overview: "Отладка Bank channel: API create, UI badge, BankSettingsPanel, compose-fe-smoke bank."
todos:
  - id: rd9-api-smoke
    content: Bank login + create form / compose-fe-smoke bank
    status: completed
  - id: rd9-ui
    content: Badge канала + BankSettingsPanel + testing simulate
    status: completed
isProject: false
---

# RD9 — Bank channel

## Meta
- **ID:** RD9 · **Группа:** Платформа · **Зависимости:** RD0 · **Оценка:** 0.5 дня
- **API:** `bank@vdp.local` / `bank` · UI: manager/root spot-check

## Scope
**In:** bank API + UI badge/settings.
**Out:** RW8 copy-only; full payment rewrite.

## Rules gate
интеграция-и-события, безопасность bank credentials, ui-web.

## UI checklist
- [ ] compose-fe-smoke bank create ok
- [ ] `/testing` → simulate bank create (app)
- [ ] Карточка: badge «Канал: Bank API», correlation id
- [ ] [BankSettingsPanel.tsx](../vdp/fe/src/components/ved/BankSettingsPanel.tsx) на org

## API verify
POST bank forms; smoke script bank path.

## Fix zones
bank.ts API, BankSettingsPanel, testing page, form-detail badge

## DoD
- [ ] Smoke bank + UI badge видны

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| bank/manager | … | … | … | … | … | … | … |
