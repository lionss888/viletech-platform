# Быстрый старт

## Требования

Docker и Docker Compose для полного стека. Локально без Docker: Go 1.22+, Node/npm или Bun для fe, Postgres 16 для core и hub.

## Полный стек через Compose

```sh
cd vdp
make compose-up
```

После health-check откроются UI http://localhost:5173, API core http://localhost:8080, hub http://localhost:8081. Smoke-тест compose-fe-smoke выполняется автоматически.

## Только frontend с hot reload

```sh
cd vdp/fe
npm i
npm run dev
```

Прокси /api на core: задайте VDP_API_PROXY_TARGET или поднимите core отдельно.

## Seed-аккаунты app-контура

Логин через /login. Email и пароль: local-part совпадает с ролью.

Аккаунт user@vdp.local. Пароль user. UUID 11111111-1111-1111-1111-111111111111.

Аккаунт manager@vdp.local. Пароль manager. UUID 22222222-2222-2222-2222-222222222222.

Аккаунт ico@vdp.local. Пароль ico. UUID 33333333-3333-3333-3333-333333333333.

Аккаунт eco@vdp.local. Пароль eco. UUID 44444444-4444-4444-4444-444444444444.

Аккаунт provider@vdp.local. Пароль provider. UUID 55555555-5555-5555-5555-555555555555.

Аккаунт bank@vdp.local. Пароль bank. UUID 77777777-7777-7777-7777-777777777777.

Аккаунт root@vdp.local. Пароль root. UUID 99999999-9999-9999-9999-999999999999.

Организация пользователя OrgID 66666666-6666-6666-6666-666666666666. Название ООО Пример.

Организация bank-клиента BankOrgID 88888888-8888-8888-8888-888888888888. Только для POST /api/v1/bank/forms.

## Demo-контур

Маршруты /demo/* используют локальные моки. Demo-логины: user@demo.vdp.local и аналоги по ролям. Demo не является источником истины по статусам. Подробнее [app-vs-demo.md](../architecture/app-vs-demo.md).

## Примеры curl

Логин и получение JWT.

```sh
curl -sf -X POST http://127.0.0.1:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@vdp.local","password":"user"}'
```

Health core.

```sh
curl -sf http://127.0.0.1:8080/api/v1/health
```

## Troubleshooting

Симптом health timeout после compose-up. Причина сервисы core, hub или fe не успели подняться. Действие docker compose ps, повтор make compose-up, проверка портов 5173, 8080, 8081.

Симптом 403 при bank create в smoke. Причина форма создана для чужой организации. Действие использовать BankOrgID 88888888-8888-8888-8888-888888888888 для bank API, не OrgID пользователя.

Симптом Playwright не ставит Chromium на macOS. Действие make playwright-e2e через Docker вместо локального npx playwright install.
