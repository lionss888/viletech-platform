---
name: E11 Inline directories
overview: Возможность добавить запись в справочник по месту (из контекста заявки/wizard), с AuthZ и без обхода домена.
todos:
  - id: e11-api-pick
    content: Выбрать 1–2 справочника с готовым create API
    status: pending
  - id: e11-bdui-ui
    content: BDUI action/wizard inline create + refresh options
    status: pending
  - id: e11-qa
    content: QA gate E11 AuthZ + happy path; LIFECYCLE
    status: pending
isProject: false
---

# E11 — Справочник «по месту» (inline add)

## Зависимость

После **E10** (базовые seed-данные есть). Отдельно от SuperAdmin E12.

## Цель

User/Manager может создать недостающую запись справочника (контрагент/адрес или аналог с готовым API) не уходя в админку.

## Строгий критерий

С экрана create/detail: действие «добавить» → запись в домене → сразу доступна в поле заявки; отказ без роли → 403.

## Scope

- Выбрать 1–2 справочника с **уже существующим** create API (prefer counterparty / organization site)
- BDUI: action или wizard step `requiresFormFields` → POST create → refresh options
- Клиент: [`WizardWidget`](fe-experiment/bdui-client/src/components/widgets/WizardWidget.tsx) / ActionBar — без обхода AuthZ
- Unit + ручной gate; LIFECYCLE E11

## Вне

Полный CRUD всех справочников; SuperAdmin directories UI (E12); bulk import.

## Правила

- `безопасность-ролей-и-данных` — роль + зона на create
- `use-cases` / `границы-и-контексты` — create в своём контексте
- `ux-формы-навигация-онбординг` — Postel, подсказка в контексте
- `ui-web-практики` — не плодить второй CRUD-паттерн
- `правила-построения` — тесты

## Проверка стабильности и качества

1. Inline create → сущность в list options
2. Чужая роль не создаёт запрещённое
3. Ошибка валидации понятна в UI
4. После create заявка может сохранить ссылку на новую сущность
5. Самопроверка: UI-скрытие ≠ единственная защита
