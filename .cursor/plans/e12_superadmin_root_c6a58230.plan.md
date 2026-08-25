---
name: E12 SuperAdmin root
overview: "BDUI-кабинет роли root (SuperAdmin): пользователи (CRUD/block), группы, справочники, force status/cancel заявок — на существующих admin/root API."
todos:
  - id: e12-seed-root
    content: Seed root account + BDUI role id root
    status: completed
  - id: e12-screens
    content: "BDUI screens: users, directories, forms admin CTA на существующих API"
    status: completed
  - id: e12-qa
    content: QA gate E12 AuthZ isolation + LIFECYCLE
    status: completed
isProject: false
---

# E12 — SuperAdmin (роль root)

## Зависимость

После E8–E11 по возможности; можно параллелить после E8, но QA — после стабильного стенда. **Отдельный эпик**, не DoD E1–E6.

## Цель

Оператор под `root` управляет платформой в BDUI: пользователи, справочники, заявки (продвинуть/отменить/блокировать в рамках существующих API).

## Строгий критерий

Seed `root@bdui.local`; login → кабинеты: users list/edit/block; directories CRUD минимум для одного типа; form force cancel или status transition через root/admin endpoint с audit.

## Scope

- Опереться на [`AccountRole.ROOT`](fe-experiment/backend-for-ved/src/lib/enums/models/account.enums.ts) и `RootMethod` / admin controllers — **не** новая роль «superadmin» в домене
- Seed root account в [`seed-bdui-lifecycle.js`](fe-experiment/backend-for-ved/scripts/seed-bdui-lifecycle.js)
- BDUI role `root`: pages users.list/detail, directories.list/detail, forms.list/detail с admin CTA
- Matrix/catalog только для root; AuthZ на API, не только schema
- Admin activity где уже есть interceptor
- Provider/ПДн: root видит больше, но UI не светит лишнее в логах

## Вне

Treasurer/1C кабинеты; Bank API; полный IAM/SSO; F6 bulk (E13).

## Правила

- `безопасность-ролей-и-данных` — least privilege; UI ≠ AuthZ
- `границы-и-контексты`, `use-cases`
- `поддержка-и-обратная-связь` — admin не замена self-service User
- `интеграция-и-события` — смена статуса только допустимыми переходами/явным admin override с следом
- `правила-построения`, `nestjs-testing`

## Проверка стабильности и качества

1. Smoke login root + schema
2. Create/block user через UI
3. Directory create/edit через UI
4. Force cancel/advance заявки только под root; User не видит CTA
5. Самопроверка: нет публичного admin smoke endpoint
