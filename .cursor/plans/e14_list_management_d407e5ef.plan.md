---
name: E14 List management
overview: "Управление заявками на экране списка: фильтры, быстрые CTA со строки, статусы/мета без обязательного захода в detail."
todos:
  - id: e14-filters-columns
    content: List filters + columns status/amount/counterparty в schema
    status: completed
  - id: e14-row-actions
    content: Row-level CTA из matrix в DataTable
    status: completed
  - id: e14-qa
    content: QA gate E14; LIFECYCLE final notes E7–E14
    status: completed
isProject: false
---

# E14 — Управление заявками на списке

## Зависимость

После **E9** (навигация/сортировка); bulk — в E13 (не дублировать multi-select сюда).

## Цель

С list-экрана: фильтр по статусу/роли-очереди; row actions для частых CTA; видимые сумма/статус/срок без открытия карточки.

## Строгий критерий

List columns: id, status, amount, ключевой контрагент/орг; filter status; ≥1 row-level CTA из matrix для текущей роли (например start/open); переход в detail сохраняется.

## Scope

- Schema list: filters + row actions в builders ([`role-cabinet.builders.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/role-cabinet.builders.ts), user list)
- Клиент: filter UI + inline action в [`DataTableWidget`](fe-experiment/bdui-client/src/components/widgets/DataTableWidget.tsx)
- Guided «следующий шаг» краткий на строке где уместно (`ui-web-практики`)
- Provider list — узкий field set без ПДн
- LIFECYCLE gate E14

## Вне

Bulk (E13); SuperAdmin users list (E12); новая аналитика/дашборды.

## Правила

- `ui-web-практики` — очередь: идентичность строки важнее декора
- `ux-взаимодействие-и-скорость` / `ux-когнитивная-нагрузка` — Pareto top tasks
- `безопасность-ролей-и-данных` — Provider
- `поддержка-и-обратная-связь` — статус понятен без саппорта
- `правила-построения`

## Проверка стабильности и качества

1. Filter status сужает список
2. Row CTA двигает статус без detail (где API позволяет)
3. Колонки сумма/статус заполнены (регресс E8)
4. Provider list без ПДн
5. Самопроверка: primary action на строке не конфликтует с open detail
