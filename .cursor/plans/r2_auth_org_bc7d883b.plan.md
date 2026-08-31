---
name: R2 Auth Org
overview: Auth/Account/Org по Nest + статусы клиента из ВИ; ICO approve/block/un-approve; Admin роль для расширений.
todos:
  - id: r2-auth
    content: Auth full Nest flows
    status: completed
  - id: r2-account
    content: Account role controllers
    status: completed
  - id: r2-org
    content: Organization ICO/Senior + statuses ВИ
    status: completed
  - id: r2-tests
    content: Postgres + tests RBAC
    status: completed
isProject: false
---

# R2: Auth, Account, Organization

## Цель

Полный контур auth/account/organization как в Nest; статусы клиента из ВИ; ICO/Senior/Admin.

## Якоря

- Nest `auth`, `account`, `organization`, `token`, `code`
- ВИ: новый / активный / заблокированный / ожидающий обработки
- Расширение §7: Admin (шаблоны/тип клиента — данные в R3/R10)

## Правила

AuthN/AuthZ на каждом endpoint; минимум ПДн в логах; тесты на роли.

## Работы

1. Auth: registration, confirm, login, refresh, restore, logout — поведение Nest [`auth-site.controller`](кастомные%20модули%20для%20адаптации%20и%20переиспользования/backend-for-ved/src/modules/auth).
2. Account CRUD по ролям (site/manager/provider/compliance/treasurer/admin).
3. Organization: site + manager + provider/senior + ICO approve/un-approve/block; rating/awaiting queue; fields_frozen.
4. Unblock request workflow (Should gap) если не закрыт.
5. Postgres persistence для accounts/orgs (не memory-only).

## DoD

- Все Nest auth/org controller routes mapped `done`.
- ВИ client statuses покрыты тестами.
- Register больше не NotImplemented.

## Вне scope

Contract types (R3), Bank client type settings (R10).
