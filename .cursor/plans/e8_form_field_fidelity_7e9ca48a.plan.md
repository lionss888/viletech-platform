---
name: E8 Form field fidelity
overview: Аудит и починка сохранения/отображения полей заявки (сумма, статус и др.) по цепочке wizard → API → DTO → detail/list BDUI.
todos:
  - id: e8-audit
    content: "Трассировка amount/status: wizard → API DTO → detail_fields/list"
    status: completed
  - id: e8-fix
    content: Исправить ключи/refresh schema+detail после action; unit builders
    status: completed
  - id: e8-qa
    content: QA gate E8; LIFECYCLE/NOTES
    status: completed
isProject: false
---

# E8 — Fidelity полей заявки (сумма, статус, данные)

## Зависимость

После **E7** (файлы пишутся). Не смешивать с UX E9 / справочниками.

## Цель

После create/submit и смены статуса оператор видит в list/detail те же сумму, статус и ключевые поля, что в домене (источник истины — API/state machine, не UI).

## Строгий критерий

Созданная заявка: `amount` и `status` не «—» на detail; list показывает статус; после CTA schema/`?status=` и detail обновляются согласованно.

## Scope

- Трассировка: wizard fields → PATCH/PUT form-payment → ответ GET detail → [`DetailFieldsWidget`](fe-experiment/bdui-client/src/components/widgets/DetailFieldsWidget.tsx) / list columns / `status_badge`
- Согласовать ключи schema (`amount`, `currencyClient`, nested `organization.*`) с реальным DTO site/manager/provider
- Refresh после action: [`ScreenPage.tsx`](fe-experiment/bdui-client/src/pages/ScreenPage.tsx) — перезагрузка detail + schema с актуальным status
- Builders: [`user-screen.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/user-screen.builders.ts), [`role-cabinet.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/role-cabinet.builders.ts)
- Unit: ожидаемые keys в detail_fields; ручной gate; LIFECYCLE/NOTES E8

## Вне

Новые поля продукта вне текущего wizard; SuperAdmin; сортировка/навигация (E9); MinIO (E7).

## Правила

- `интеграция-и-события`, `use-cases` — статус из домена
- `ui-web-практики` — скан: статус / сумма / CTA первыми
- `typescript-clean-code`, `nestjs-testing`, `правила-построения`

## Проверка стабильности и качества

1. Wizard с суммой → detail показывает ту же сумму
2. Status badge = статус из GET form-payment
3. List column status не пустой для новой заявки
4. После accept/reject detail обновляется без F5 «вслепую»
5. Самопроверка: Provider detail без ПДн клиента
