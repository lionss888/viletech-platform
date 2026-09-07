# VDP app seed: пользователи всех ролей (Core API)

Контур: **app** (`/login` → JWT → `vdp/core`), не `/demo`.

Источник кода: [`vdp/core/internal/repository/seed/seed.go`](../vdp/core/internal/repository/seed/seed.go), зеркало FE: [`vdp/fe/src/lib/ved/app-seed-accounts.ts`](../vdp/fe/src/lib/ved/app-seed-accounts.ts).

## Правило пароля

Пароль = **local-part** email (до `@`). Пример: `user@vdp.local` → `user`.

Demo-контур использует другие адреса (`*@demo.vdp.local`) и другие пароли — не смешивать.

## Аккаунты

| Роль | Email | Пароль | Account UUID | Организация |
|---|---|---|---|---|
| Клиент (user) | `user@vdp.local` | `user` | `11111111-1111-1111-1111-111111111111` | ООО Пример (`66666666-…`, ИНН `7700000000`) |
| Менеджер | `manager@vdp.local` | `manager` | `22222222-2222-2222-2222-222222222222` | — |
| Внутренний комплаенс (ICO) | `ico@vdp.local` | `ico` | `33333333-3333-3333-3333-333333333333` | — |
| Внешний комплаенс (ECO) | `eco@vdp.local` | `eco` | `44444444-4444-4444-4444-444444444444` | — |
| Провайдер | `provider@vdp.local` | `provider` | `55555555-5555-5555-5555-555555555555` | — |
| Суперадмин (root) | `root@vdp.local` | `root` | `99999999-9999-9999-9999-999999999999` | — |
| Банк | `bank@vdp.local` | `bank` | `77777777-7777-7777-7777-777777777777` | Bank Client Org (`88888888-…`, ИНН `7700000001`) |

Имена в seed: Ivan Petrov, Manager Seed, ICO Seed, ECO Seed, Provider Seed, Root Admin, Bank Seed.

## Что seed создаёт / не создаёт

**Создаёт:** аккаунты ролей выше; org клиента (approved + active для пилота U→M→P); org банка (approved).

**Не создаёт:** заявки (form_payments), контрагентов, work chats. Контрагентов пользователь/тесты создают сами.

## Очистка заявок (local/compose)

При старте core на `ENVIRONMENT=development|local|test|ci` (и по умолчанию пустой) после seed выполняется wipe всех заявок, если не задано `SEED_WIPE_FORMS=0`.

Compose: `SEED_WIPE_FORMS=1` в сервисе `core`. Staging/prod/alpha/beta/gamma — wipe запрещён.

Локально перезапуск core с wipe:

```sh
cd vdp && docker compose restart core
# или
SEED_WIPE_FORMS=1 make run-core
```

Цель Makefile: `make core-seed-reset` — перезапуск core с wipe (compose).

## Пилот process-roles

Стержень U→M→P: ICO/ECO обычно **не** в процессе (`/process-roles`). Seed-учётки ICO/ECO остаются для сценария проверки организации и включения слотов.
