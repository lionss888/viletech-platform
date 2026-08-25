---
name: E13 Batch actions
overview: Пакетные действия над несколькими сущностями (заявки/пользователи) в BDUI list с подтверждением и AuthZ.
todos:
  - id: e13-select-ui
    content: Multi-select + bulk bar в DataTable
    status: completed
  - id: e13-actions
    content: Bulk CTA на API (batch или sequential idempotent)
    status: completed
  - id: e13-qa
    content: QA gate E13; LIFECYCLE
    status: completed
isProject: false
---

# E13 — Пакетные действия (bulk)

## Зависимость

После **E12** (есть admin/list контекст) или минимум после E9 list UX. Не смешивать с single-row list management E14.

## Цель

Оператор отмечает N строк в списке и выполняет одно разрешённое действие (например cancel / assign / block) с подтверждением.

## Строгий критерий

Multi-select на forms.list (и при готовности users.list); bulk CTA; частичный успех видим; без права — 403 на каждую/пакет.

## Scope

- [`DataTableWidget`](fe-experiment/bdui-client/src/components/widgets/DataTableWidget.tsx): selection + bulk action bar
- Catalog: bulk actions только где API поддерживает batch **или** последовательные идемпотентные вызовы с лимитом N
- Подтверждение irreversible (`ui-web-практики`)
- Не обходить матрицу статусов: фильтровать eligible rows
- Unit/ручной gate; LIFECYCLE E13

## Вне

Произвольный scripting; async job UI; полный SuperAdmin CRUD (E12).

## Правила

- `безопасность-ролей-и-данных`, `интеграция-и-события` — идемпотентность повторов
- `ux-когнитивная-нагрузка` — Hick: мало bulk-опций
- `алгоритмы-и-сложность` — лимит N, без O(n²) в UI
- `правила-построения`

## Проверка стабильности и качества

1. Select 2+ → bulk action меняет только eligible
2. Неeligible остаются с понятной ошибкой
3. Confirm dialog показывает число/действие
4. Без роли bulk CTA нет
5. Самопроверка: лимит размера пакета
