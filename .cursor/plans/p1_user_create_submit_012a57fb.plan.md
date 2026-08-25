---
name: P1 User create submit
overview: "BDUI User: wizard создания заявки (import+аванс+товар) до отправки на проверку поверх site API в fe-experiment."
todos:
  - id: p1-wizard
    content: BDUI wizard screens + actions map to site create/PATCH/accept
    status: completed
  - id: p1-widgets
    content: "Widgets: steps, file upload, deal fields"
    status: completed
  - id: p1-qa
    content: "QA gate: unit + manual submit to verification queue"
    status: completed
isProject: false
---

# P1 — User: создание и отправка заявки

## Зависимость

После **P0** (матрица, seed, schema API).

## Цель

Клиент проходит wizard и отправляет заявку; статус уходит в очередь Internal CO (первая орг) или External CO.

## Scope

- Экраны BDUI: `forms.create` (шаги), `forms.list`, `forms.detail` (draft)
- Шаги по ВИ: инвойс/контракт (upload или «нет документов») → условия сделки (direction import, currencies, amount, advance, good + hsCode, дата отгрузки) → организация → submit (`PUT …/form/accept`)
- API: [`form-payment-site.controller.ts`](fe-experiment/backend-for-ved/src/modules/form-payment/web/site/form-payment-site.controller.ts), file-store upload, organization site
- Клиент: виджеты wizard/steps, file upload, form fields в [`bdui-client`](fe-experiment/bdui-client/)
- Вне: Figma polish; Diadoc; постоплата (P7)

## Проверка стабильности и качества

1. Unit: schema builders create/list/detail для draft/creating
2. Ручной: User seed → создать → заполнить → submit; статус `organization_waiting_verification` или `form_waiting_verification`
3. Негатив: submit без обязательных полей → понятная ошибка API, UI не ломается
4. Список показывает новую заявку только этому User
5. Самопроверка: действие разрешено роли User на статусе draft/creating
