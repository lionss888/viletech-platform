---
name: UAT F6 receipt CTA
overview: "Пункт 6: переименовать CTA «Подтвердить поступление (без казначея)» → «Подтвердить поступление»."
todos:
  - id: f6-copy
    content: Убрать суффикс в actions.ts continuityInjectedActions (+ тесты copy)
    status: completed
  - id: f6-audit
    content: Поиск других вхождений «без казначея» в FE/docs пилота
    status: completed
  - id: f6-qg
    content: check-env-parity → actions.ts = ladder → ci-pr-pilot (e2e вне smoke не трогать → не ci-main); close DoD + notify
    status: completed
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
- Gate: **`ci-pr-pilot`** (`actions.ts` ∈ ladder; prepush path-aware).

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-web-практики`, `use-cases`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

## DoD / QG

Path-aware prepush: `vdp/fe/src/lib/ved/actions.ts` ∈ `pilot-matrix-paths.grep` → хук всегда выберет **`ci-pr-pilot`**. `ci-main` только если в том же diff e2e вне smoke (обычно вне scope). Полная страховка перед merge в main — opt-in `FULL_PREPUSH_GATE=1`, не default DoD волны.

- [x] Label без «(без казначея)»
- [x] `make check-env-parity`
- [x] Unit copy
- [x] Gate: `make ci-pr-pilot` (ladder); e2e вне smoke в том же PR → `make ci-main`
- [x] DoD/todos; sync-handoff-queue; notify-mgmt

## Accept

- На карточке в сценарии continuity manager видит «Подтвердить поступление».
- Действие по-прежнему проводит тот же core transition.
