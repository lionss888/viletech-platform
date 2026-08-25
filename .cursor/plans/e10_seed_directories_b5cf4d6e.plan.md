---
name: E10 Seed directories
overview: "Расширить seed справочников для локальных тестов: валюты, тестовые компании/контрагенты, адреса и география."
todos:
  - id: e10-seed-data
    content: "Расширить seed: валюты, компании/контрагенты, адреса/гео"
    status: pending
  - id: e10-wizard-wire
    content: Проверить выбор справочников в wizard/schema без новых API
    status: pending
  - id: e10-qa
    content: QA gate E10; README/LIFECYCLE seed table
    status: pending
isProject: false
---

# E10 — Расширение seed-справочников

## Зависимость

После **E8** (поля заявки читаемы). Не путать с inline-CRUD E11.

## Цель

Локальный стенд даёт достаточно справочных данных для заполнения заявки без ручного Mongo.

## Строгий критерий

После `seed-bdui-lifecycle.js` / `start-local`: ≥2 валюты usable; ≥2 организации/контрагента; адреса/гео для wizard; User может выбрать их в UI.

## Scope

- Расширить [`seed-bdui-lifecycle.js`](fe-experiment/backend-for-ved/scripts/seed-bdui-lifecycle.js): currencies, orgs/counterparties, address/geo stubs с фиксированными id при необходимости
- Подключить выбор в wizard/schema, если поля уже есть в API — без нового CRUD UI
- Документировать seed-набор в [`README.md`](fe-experiment/README.md) / [`LIFECYCLE.md`](fe-experiment/LIFECYCLE.md)
- Не ломать fixed ObjectIds E2/E6 (`BDUI_SEED_*`)

## Вне

UI «добавить в справочник» (E11); SuperAdmin; прод-импорт справочников.

## Правила

- `правила-построения` — воспроизводимый seed
- `границы-и-контексты` — справочники в своих коллекциях, без god-seed
- `безопасность-ролей-и-данных` — тестовые ПДн минимальны / синтетика

## Проверка стабильности и качества

1. Re-seed идемпотентен по ключевым id
2. Wizard видит >1 валюту / компанию где применимо
3. Smoke login 5 ролей не сломан
4. NOTES: перечень seed-справочников
5. Самопроверка: Provider seed без лишних ПДн
