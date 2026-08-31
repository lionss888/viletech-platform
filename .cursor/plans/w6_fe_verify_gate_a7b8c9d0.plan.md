---
name: W6 FE Verify Gate
overview: "Gate FE↔core: unit mapper/actions, узкий journey smoke, честный %. Без E2E-мороженого и prod-claims. Закрыто 2026-08; дальше RD0–RD11."
todos:
  - id: w6-unit
    content: Unit mapper + app-actions (vitest); table-driven
    status: completed
  - id: w6-smoke
    content: "Journey smoke: demo offline + app login/list/action/create"
    status: completed
  - id: w6-honesty
    content: "Gate-ответ: N/M matrix, дыры, completed только по DoD волн"
    status: completed
isProject: false
---

# W6: Verification gate

## Цель

Закрыть программу проверяемо: unit в основании + один критичный journey; честный статус FE-адатера.

## Якоря

- [`vdp/docker-compose.yml`](vdp/docker-compose.yml); тесты рядом с `mappers` / `app-actions`
- Тест-раннер: **vitest** в `vdp/fe` (добавить devDependency, если ещё нет)

## Правила

- [`тесты-архитектуры`](.cursor/rules/тесты-архитектуры.mdc) — unit ≫ E2E; journey не «все story»; без полного Playwright suite в программе
- [`правила-построения`](.cursor/rules/правила-построения.mdc) — самопроверка переходов/ролей
- [`use-cases`](.cursor/rules/use-cases.mdc) — smoke покрывает допустимый шаг + осознание запрета роли
- [`безопасность-ролей-и-данных`](.cursor/rules/безопасность-ролей-и-данных.mdc) — provider card без ПДн (если seed доступен)
- [`развертывание-и-доставка`](.cursor/rules/развертывание-и-доставка.mdc) — compose core = стенд проверки; выкат fe-сервиса вне scope
- [`playwright-e2e`](.cursor/rules/playwright-e2e.mdc) — **не** внедряем suite в W6 (антипаттерн мороженого)
- DoD-дисциплина: нельзя `completed` пачкой; нельзя «prod / паритет / 100%»; stub и partial matrix — в дырах

## Работы

1. Vitest: mapper + FE→`coreAction` mapping.
2. Ручной journey checklist **в ответе агента** (не новый md):
   - demo offline action
   - app: login → list → action → status → create
   - session isolation
   - provider PII hide (если применимо)
3. Сводка: N/M статусов с CTA; out-of-scope список.
4. Проставить `completed` только волнам с DoD; иначе дыры.

## DoD

- Vitest зелёный.
- Smoke checklist да/нет в gate-ответе.
- Формулировка: «FE app = UI-адатер auth+read+actions(partial)+create; demo mock; политика в core; не prod».
- Родительский roadmap `exec-w*` честен.

## Вне scope

Playwright CI, CDC Pact pipeline, Nest path UI parity, BDUI.

## Gate

demo OK / login OK / action OK / create OK / matrix N/M / дыры. Без «100%».

## Статус закрытия (2026-08-29)

- Vitest: **88/88** green (`cd vdp/fe && npm test`).
- Compose gates: см. [`vdp/rd0-baseline.md`](vdp/rd0-baseline.md).
- Матрица CTA: **~22/40** статусов (`coveredStatusCount`); не full lifecycle.
- Известные оговорки W2/W3/W4: client `visibleForms` в app list; нет FE unit на 403; catalog API вместо stub orgs.
- Playwright — **RD11**, не W6.
