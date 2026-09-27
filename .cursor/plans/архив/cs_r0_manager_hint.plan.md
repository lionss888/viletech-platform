---
name: CS-R0 manager hint
overview: "Закрытие учёта уже сделанной подсказки «Как собрать путь заявки» на form detail. Новый код не пишем, если дерево не сломано."
todos:
  - id: r0-verify-files
    content: "Проверить наличие ManagerRouteHintPanel + manager-route-hint.ts/.test.ts + вставка в form-detail-page"
    status: completed
  - id: r0-verify-unit
    content: "npm test -- manager-route-hint.test.ts зелёный"
    status: completed
  - id: r0-verify-language
    content: "Копирайт без BPM / «конструктор всего»; только manager/root"
    status: completed
isProject: false
---

# CS-R0 — подсказка менеджеру (учёт done)

Родитель: [конструктор_реализация_889c3d6f.plan.md](конструктор_реализация_889c3d6f.plan.md). Подготовка: [конструктор_сценариев_42bb2cf9.plan.md](конструктор_сценариев_42bb2cf9.plan.md).

## Цель

Зафиксировать DoD волны подсказки после приёмки «ок». Это не новая разработка — код уже в дереве.

## Сделано (артефакты)

- [vdp/fe/src/lib/ved/manager-route-hint.ts](vdp/fe/src/lib/ved/manager-route-hint.ts)
- [vdp/fe/src/lib/ved/manager-route-hint.test.ts](vdp/fe/src/lib/ved/manager-route-hint.test.ts)
- [vdp/fe/src/components/ved/ManagerRouteHintPanel.tsx](vdp/fe/src/components/ved/ManagerRouteHintPanel.tsx)
- Вставка в [vdp/fe/src/components/ved/pages/form-detail-page.tsx](vdp/fe/src/components/ved/pages/form-detail-page.tsx) под «Жизненный цикл»
- `data-testid="manager-route-hint"`
- `make check-env-parity` + `make ci-pr` — зелёные (на момент внедрения)

## Слои

| Слой | Статус |
|---|---|
| UI / IA | done — блок подсказки |
| FE | done — panel + copy module |
| Unit | done |
| E2E | вне этой волны → CS-R2 |
| Домен / API | не трогали |

## DoD

- Панель только для `manager` / `root`
- Язык: сборка из рычагов, не BPM
- Unit зелёный
- Без передачи process-roles менеджеру, без смены статусной машины

## Вне scope

Новый diff без причины; BPM; CS-R1…R4.

## Сверка rules

`честность-готовности`, `ui-web-практики`, `поддержка-и-обратная-связь`, `use-cases` (UI — проекция).
