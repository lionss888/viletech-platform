---
name: E3 Happy-path UI
overview: "Сквозной happy-path import+аванс+товар до COMPLETED только через UI под 5 seed-ролями ВИ; починить UI-блокеры после E2."
todos:
  - id: e3-checklist
    content: LIFECYCLE чеклист оператора — шаг × роль × ожидаемый статус
    status: pending
  - id: e3-blockers
    content: UI-блокеры happy-path (refresh, direction, provider hint/default)
    status: pending
  - id: e3-terminal
    content: После COMPLETED — пустой mutate action_bar User/Manager/Provider
    status: pending
  - id: e3-qa
    content: "QA gate E3: браузерный прогон 5 ролей → COMPLETED + unit regress"
    status: pending
isProject: false
---

# E3 — Сквозной happy-path UI (5 ролей)

## Зависимость

После зелёного **E2** (file upload в ActionBar работает).

## Цель

Одна заявка `import + аванс + товар` доходит до `COMPLETED` **только через UI** (`http://localhost:5173`) под пятью seed-аккаунтами.

## Строгий критерий (вклад в DoD программы)

Оператор без Swagger/curl может: **создать заявку и провести её по всему каноническому lifecycle до `COMPLETED` только через UI**.

## Scope

- Чеклист оператора в [`LIFECYCLE.md`](fe-experiment/LIFECYCLE.md): шаги по ролям + ожидаемый статус после каждого CTA
- Починить UI-блокеры happy-path после E2: refresh schema после action, `direction=import` по умолчанию в wizard, assign provider — seed provider id в hint/default для demo (без обязательного сырого prompt, если id известен из seed)
- После `COMPLETED`: пустой mutate action_bar у User / Manager / Provider
- Регрессия unit BDUI matrix

## Вне

Corrections / cancel / postpay (это **E4**); Figma-визуал; Diadoc.

## Опора

- Matrix/catalog P0–P7: [`lifecycle-action.matrix.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/lifecycle-action.matrix.ts)
- Seed: [`scripts/seed-bdui-lifecycle.js`](fe-experiment/backend-for-ved/scripts/seed-bdui-lifecycle.js)
- Канон: import + аванс + товар (как P1–P6)

## Проверка стабильности и качества

1. Полный прогон 5 аккаунтов в браузере до `COMPLETED` (без curl)
2. Регрессия `npm test -- --testPathPattern=modules/bdui`
3. После complete — нет mutate CTA
4. Самопроверка: финальный переход только Manager shipment accept / completed
5. Отметить E3 DONE в LIFECYCLE
