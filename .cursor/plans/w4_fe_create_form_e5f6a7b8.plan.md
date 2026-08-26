---
name: W4 FE Create Form
overview: "Use case create: POST /api/v1/forms → карточка. Справочники — stub. Gate: 201 + видно в list."
todos:
  - id: w4-create-api
    content: createForm + /forms/new (валидация денег/полей)
    status: pending
  - id: w4-stub-dirs
    content: App orgs/counterparties stub со ссылкой на /demo
    status: pending
  - id: w4-gate
    content: "Gate: POST 201 + заявка в GET /forms"
    status: pending
isProject: false
---

# W4: Create form

## Цель

User/manager создаёт черновик через core use case create; UI — форма-адатер.

## Якоря

- `POST /api/v1/forms`; app `/forms/new`

## Правила

- [`use-cases`](.cursor/rules/use-cases.mdc) — create = одно намерение; статус после create из ответа core
- [`интеграция-и-события`](.cursor/rules/интеграция-и-события.mdc) — sync REST create
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) — лейблы видимы; валюта у поля; ошибки «что не так / как исправить»
- [`ux-формы-навигация-онбординг`](.cursor/rules/ux-формы-навигация-онбординг.mdc) — Postel: нормализация amount
- [`безопасность-ролей-и-данных`](.cursor/rules/безопасность-ролей-и-данных.mdc) — 403 для ролей без create
- DoD-дисциплина: stub справочников ≠ CRUD done ([`поддержка-и-обратная-связь`](.cursor/rules/поддержка-и-обратная-связь.mdc) — честный empty/stub copy)

## Работы

1. `createForm` в API-клиенте.
2. `/forms/new` → POST → `/forms/$id`.
3. App `/organizations`, `/counterparties`: stub «следующий этап; полное демо — `/demo/...`».
4. Nav «Новая заявка» для user/manager/root в UI; enforce на core.

## DoD

- 201 + заявка в list/card.
- Demo create на mock сохранён.
- Stub справочников помечен как stub.

## Вне scope

Counterparty attach, upload, Excel import.

## Gate

«W4 done — create; demo DX = W5».
