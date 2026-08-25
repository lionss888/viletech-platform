---
name: P0 lifecycle foundation
overview: "Каркас BDUI lifecycle в fe-experiment: матрица role×status→actions для 5 ролей ВИ, seed-аккаунты, расширение контракта схем; канонический path import+аванс+товар."
todos:
  - id: p0-matrix
    content: Матрица role×status→actions + unit table-tests
    status: completed
  - id: p0-schema-api
    content: Расширить BDUI schema API на 5 ролей ВИ
    status: completed
  - id: p0-seed
    content: Seed-скрипт 5 ролей + org
    status: completed
  - id: p0-qa
    content: LIFECYCLE чеклист + прогон quality gate P0
    status: completed
isProject: false
---

# P0 — Каркас lifecycle BDUI

## Цель

Подготовить общий каркас, без которого сценарии P1–P6 разъедутся: единая матрица переходов, seed ролей, расширенный контракт BDUI.

## Scope

- Матрица `AccountRole × FormPaymentStatus → actionIds` (happy-path import+аванс+товар + явные запреты)
- Модуль [`fe-experiment/backend-for-ved/src/modules/bdui/`](fe-experiment/backend-for-ved/src/modules/bdui/): резолверы по ролям, `GET /bdui/schema/{role}/{page}`
- Seed-скрипт: User, Internal CO, External CO, Manager, Provider + тестовая РФ-организация
- Чеклист сквозного прогона (заготовка в [`fe-experiment/NOTES.md`](fe-experiment/NOTES.md) / `LIFECYCLE.md`)
- Вне: UI wizard, визуал Figma, Treasurer/ONE_C

## Опора

- Статусы: [`form-payment.enums.ts`](fe-experiment/backend-for-ved/src/lib/enums/models/form-payment.enums.ts)
- Роли: [`account.enums.ts`](fe-experiment/backend-for-ved/src/lib/enums/models/account.enums.ts)
- ВИ: [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt)
- Правила: `интеграция-и-события`, `безопасность-ролей-и-данных`, `правила-построения`

## Проверка стабильности и качества

1. Unit-тесты table-driven на резолвер: для ключевых статусов каждая роль — только ожидаемые actionIds
2. Негативные кейсы: чужая роль не получает чужие CTA
3. Seed создаёт 5 логинов; login каждого возвращает JWT
4. `GET /bdui/schema/user/login` и `…/manager/…` (или заявленные page) отдают 200
5. Самопроверка по правилам построения: переходы только явными действиями ролей
