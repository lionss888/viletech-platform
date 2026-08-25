---
name: E9 Operator UX
overview: Навигация (к списку/назад), сортировка очереди и контекстные инфо-блоки по заполнению/файлам в BDUI-client и schema hints.
todos:
  - id: e9-nav
    content: К списку / назад на create и detail (ScreenPage)
    status: completed
  - id: e9-sort-hints
    content: Сортировка DataTable + schema/wizard hints PDF и полей заявки
    status: completed
  - id: e9-qa
    content: QA gate E9; LIFECYCLE/NOTES
    status: completed
isProject: false
---

# E9 — UX оператора (навигация, сортировка, подсказки)

## Зависимость

После **E8** (поля/статус доверяемы). Не смешивать с E7/E10+.

## Цель

Оператор не теряется в deep detail; очередь читаема; подсказки по файлам и типам данных заявки — в контексте экрана (self-service, не саппорт).

## Строгий критерий

На create/detail есть «К списку» / назад; list сортируется хотя бы по статусу или дате; hints: лимит/тип PDF + пояснения ключевых полей договора/поставки.

## Scope

- Навигация: breadcrumbs / «назад к очереди» на [`ScreenPage.tsx`](fe-experiment/bdui-client/src/pages/ScreenPage.tsx) и detail/create — паттерн из `ui-web-практики` (кабинет → список → карточка)
- Сортировка list: client-side или query param на [`DataTableWidget.tsx`](fe-experiment/bdui-client/src/components/widgets/DataTableWidget.tsx); smart default очереди CO/Manager (`ui-web-практики`)
- Hints в builders: размер/accept PDF; тип контракта / условия сроков — [`user-screen.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/user-screen.builders.ts), [`role-cabinet.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/role-cabinet.builders.ts); wizard copy — [`WizardWidget.tsx`](fe-experiment/bdui-client/src/components/widgets/WizardWidget.tsx)
- Empty states списка с первым шагом
- Unit: hints присутствуют на ключевых статусах; LIFECYCLE gate E9

## Вне

Pixel-perfect Figma; SuperAdmin; bulk; справочники E10/E11; смена визуального design system.

## Правила

- `ux-формы-навигация-онбординг`, `ux-когнитивная-нагрузка`, `ux-взаимодействие-и-скорость`
- `ui-web-практики` — иерархия статус/сумма/CTA; breadcrumbs
- `поддержка-и-обратная-связь` — help вместе с фичей; «что дальше» на карточке
- `правила-построения` — тесты + самопроверка

## Проверка стабильности и качества

1. Detail → «К списку» без ручного URL
2. List: сортировка меняет порядок строк
3. Upload CTA / wizard показывают лимит/тип PDF
4. Hint по полям договора/поставки виден User на create/detail
5. Самопроверка: один primary CTA на экран действия сохранён
