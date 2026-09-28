---
name: UAT F6 receipt CTA
overview: "Пункт 6: переименовать CTA «Подтвердить поступление (без казначея)» → «Подтвердить поступление»."
todos:
  - id: f6-copy
    content: "Убрать суффикс в actions.ts continuityInjectedActions (+ тесты copy)"
    status: pending
  - id: f6-audit
    content: Поиск других вхождений «без казначея» в FE/docs пилота
    status: pending
  - id: f6-qg
    content: check-env-parity → ci-pr-pilot (ActionPanel copy); close DoD + notify
    status: pending
isProject: false
---

# UAT F6: copy CTA поступления

## Источник

Этап Платёж · «Доступные действия»: зелёная кнопка **«Подтвердить поступление (без казначея)»**. Нужно: **«Подтвердить поступление»**.

## Вердикт по коду

- Единственный продуктовый rewrite в [actions.ts](vdp/fe/src/lib/ved/actions.ts) `continuityInjectedActions` (~label с «без казначея»).
- Матрица treasurer по умолчанию — «Подтвердить покрытие» (`app-actions.ts`); не трогать без нужды.

## Цель

Primary CTA поступления без скобок и без «без казначея». Поведение action то же.

## Scope

- Смена label в continuity inject.
- Unit/snapshot на continuity CTA copy.
- Аудит строк «без казначея».

## Вне scope

- Включение/выключение treasurer slot в process-roles.
- Смена доменного action id.

## Слои

- UI/FE: actions.ts (+ тесты continuity/cta).
- Домен/API: нет.
- Gate: **`ci-pr-pilot`** (ActionPanel / continuity CTA).

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-web-практики`, `use-cases`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

## DoD / QG

- [ ] Label без «(без казначея)»
- [ ] `make check-env-parity`
- [ ] Unit copy
- [ ] `make ci-pr-pilot`
- [ ] DoD/todos; sync-handoff-queue; notify-mgmt

## Accept

- На карточке в сценарии continuity manager видит «Подтвердить поступление».
- Действие по-прежнему проводит тот же core transition.
