---
name: RW1 User Copy
overview: "Копирайт кабинета клиента (User): nav, statuses, CTA, ROLE_FOCUS, empty states. Root не трогаем. Status/action id без изменений."
todos:
  - id: rw1-copy-layer
    content: Ввести/расширить lib/ved/copy для user voice
    status: pending
  - id: rw1-labels
    content: Role-aware labels User (statuses, actions, nav, dashboard)
    status: pending
  - id: rw1-uploads
    content: Формулировки upload-веток (contract/order/payment/report/shipment)
    status: pending
  - id: rw1-gate
    content: "DoD: User UI на сленге участника ВЭД; npm test; root не тронут"
    status: pending
isProject: false
---

# RW1 — User (клиент) copy

## Meta
- **ID:** RW1 · **Группа:** Клиент · **Зависимости:** RW0 · **Оценка:** 0.5 дня
- **Login:** `user@vdp.local` / `user` · **Entry:** `/dashboard`, `/forms`, `/forms/new`

## Scope
**In:** labels/subtitles/confirm/empty для User в app.
**Out:** root; demo; смена матрицы статусов; RD1 баги (только copy).

## Rules gate
ui-web-практики, ux-формы-навигация-онбординг, поддержка-и-обратная-связь, интеграция-и-события.

## UI checklist (copy)
- [ ] ROLE_FOCUS user — лексика участника ВЭД (сделка/заявка/документы)
- [ ] Статусы user-видимые: draft → organization_waiting → corrections → uploads
- [ ] CTA: accept_form, cancel, upload_* — глагол + объект
- [ ] Wizard `/forms/new` — поля/шаги в терминах контракт/инвойс/валюта
- [ ] Empty states реестра
- [ ] **Root UI без изменений**

## Источники
[`glossariy-po-rolyam.txt`](.cursor/rules/методология/glossariy-po-rolyam.txt), [ved.gov.ru](https://ved.gov.ru/#/)

## Fix zones
`lib/ved/copy/*`, statuses.ts, actions.ts (labels only), nav-config.ts, forms-*-page, dashboard-page ROLE_FOCUS

## DoD
- [ ] User copy согласован с глоссарием
- [ ] Канонические id не менялись
- [ ] Root не тронут; `npm test` green при наличии unit на copy
