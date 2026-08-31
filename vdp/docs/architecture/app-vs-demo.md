# App и Demo контуры

## App-контур

Маршруты /login, /dashboard, /forms, /admin, /testing без префикса demo.

Аутентификация JWT через POST /api/v1/auth/login. Токен в sessionStorage vdp-auth-v1.

Все команды смены статуса идут в vdp/core через прокси /api.

Источник истины статуса — ответ core после команды. UI отображает проекцию.

Seed-аккаунты *@vdp.local с паролем равным local-part email.

## Demo-контур

Маршруты /demo/login, /demo/dashboard и аналоги.

Состояние в localStorage ved-demo-state-v2. Backend не вызывается для доменных переходов.

Назначение UX-показ и прототипирование без поднятого core.

Demo не является источником истины. Parity и gate-тесты относятся к app-контуру.

## Общий UI shell

Оба контура используют VedAppShell и компоненты src/components/ved/pages/*. Route-файлы только объявляют Route.

## Create в app

После POST /forms клиент вызывает recognize_complete. OCR не подключён в MVP — заявка сразу переходит в draft.

## Lovable sync

Ветка fe связана с Lovable. Не переписывать опубликованную git history force push и rebase/amend pushed commits. См. fe/AGENTS.md.

Post-Lovable recovery (2026-08-31): после sync 4b7259bb app-контур был восстановлен из pre-sync коммита (lib/api, JWT login, /demo/* split). Gate: npm test, make integration-gate, Playwright e2e/*.spec.ts (6 specs).
