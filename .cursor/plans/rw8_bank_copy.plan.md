---
name: RW8 Bank Copy
overview: "Копирайт банковского канала: badge, BankSettingsPanel, testing simulate. Root UI не переписываем."
todos:
  - id: rw8-badge
    content: Badge «Канал: Bank API» + correlation copy
    status: pending
  - id: rw8-settings
    content: BankSettingsPanel labels (webhook/commission)
    status: pending
  - id: rw8-gate
    content: "DoD: bank channel voice; root shell не тронут"
    status: pending
isProject: false
---

# RW8 — Bank channel copy

## Meta
- **ID:** RW8 · **Группа:** Платформа (без root wording) · **Зависимости:** RW0 · **Оценка:** 0.5 дня
- **API login:** `bank@vdp.local` / `bank` · UI проверка под manager (не root copy)

## Scope
**In:** bank badge, settings panel, testing page bank simulate strings.
**Out:** переписывание superadmin dashboard / `/admin` (root); RD9 functional.

## Rules gate
ui-web-практики, istochniki ЦБ (cbr.ru/registries/infrastr), интеграция-и-события.

## UI checklist (copy)
- [ ] Badge канала + correlation id подпись
- [ ] BankSettingsPanel: webhook, commission — ясный язык
- [ ] Testing simulate bank create — без «магических» формулировок
- [ ] **Root UI без изменений** (не трогать ROLE_FOCUS.root / admin copy)

## Fix zones
BankSettingsPanel.tsx, form-detail bank badge, testing page strings

## DoD
- [ ] Bank copy согласован с ЦБ-лексикой где уместно
- [ ] Root не тронут
