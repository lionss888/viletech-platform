---
name: W2 FE Forms Read
overview: "Проекция заявок из core: mapper, React Query list/get, иерархия UI. Gate: реестр = status/id с API. Закрыто 2026-08; дальше RD0–RD11."
todos:
  - id: w2-api-forms
    content: lib/api/forms.ts list/get
    status: completed
  - id: w2-mapper
    content: mappers.ts + unit test (≥3 кейса)
    status: completed
  - id: w2-screens
    content: dashboard/forms/detail — Query; статус+что дальше; loading
    status: completed
  - id: w2-shell
    content: AppShell без role-switch; logout API; provider без ПДн-колонок
    status: completed
  - id: w2-gate
    content: "Gate: list/get совпадают с core status/id"
    status: completed
isProject: false
---

# W2: Forms read path

## Цель

App показывает **проекцию** заявок core; visibility и статус — серверные.

## Якоря

- `GET /api/v1/forms`, `GET /api/v1/forms/{id}`; [`form.go`](vdp/core/internal/domain/formpayment/form.go); [`statuses.ts`](vdp/fe/src/lib/ved/statuses.ts)

## Правила

- [`чистая-архитектура`](.cursor/rules/чистая-архитектура.mdc) — mapper = adapter DTO↔UI; не SM на клиенте
- [`интеграция-и-события`](.cursor/rules/интеграция-и-события.mdc) — UI не invents статус; не `visibleForms` в app
- [`безопасность-ролей-и-данных`](.cursor/rules/безопасность-ролей-и-данных.mdc) — Provider: скрыть ПДн-поля в list/card
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) — скан: статус / сумма / id; очередь ≠ декоративные бейджи
- [`поддержка-и-обратная-связь`](.cursor/rules/поддержка-и-обратная-связь.mdc) — на карточке short status + «что дальше» из stage/meta (self-service)
- [`screaming-architecture`](.cursor/rules/screaming-architecture.mdc) — код в `lib/api`, `lib/ved`, не «helpers/misc»
- [`тесты-архитектуры`](.cursor/rules/тесты-архитектуры.mdc) / [`правила-построения`](.cursor/rules/правила-построения.mdc) — unit mapper в основании пирамиды
- [`ux-взаимодействие-и-скорость`](.cursor/rules/ux-взаимодействие-и-скорость.mdc) — skeleton/loading &lt; ощущения «мёртвого» ожидания
- DoD-дисциплина: пустой list при пустой БД = ok

## Работы

1. `listForms` / `getForm` в `lib/api/forms.ts`.
2. `mappers.ts` + unit ≥3 кейса.
3. App `/dashboard`, `/forms`, `/forms/$id`: React Query; empty/error states по ui-web.
4. Карточка: StatusBadge + текст следующего шага (из stage/filter meta), без локального action apply.
5. App shell: account name/role; logout; без `<select>` роли.
6. Actions UI — скрыты или «доступно после W3», не mock `applyAction`.

## DoD

- Auth list/card показывают core `id`+`status`.
- Смена роли только re-login.
- Mapper unit зелёный.
- Demo `/demo/forms` на mock.

## Вне scope

POST actions, create, Nest form-payment collections.

## Gate

«W2 done — read projection; actions = W3».
