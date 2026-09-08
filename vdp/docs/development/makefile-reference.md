# Справочник Makefile

Все команды выполняются из каталога vdp.

## deps

Загрузка Go-модулей core, hub, shared, mail-gateway, sms-gateway и каталога vdp/release-gate. Команда make deps.

## test

Unit-тесты Go в core, hub, shared, mail-gateway, sms-gateway и каталоге vdp/release-gate без build tag integration. Команда make test.

## test-integration

Postgres integration tests с тегом integration в core store outbox и hub inbox. Требует DATABASE_URL_CORE и DATABASE_URL_HUB. Команда make test-integration.

## test-adapters

Hub adapter HTTP tests docs mail sms telegram diadoc onec. Команда make test-adapters. Входит в CI job fast.

## build

Сборка bin/vdp-core и bin/vdp-hub. Команда make build.

## db-setup и db-migrate

Локальный Postgres: создание ролей vdp_core и vdp_hub, баз vdp_core и vdp_hub, применение migrations. Команды make db-setup и make db-migrate.

## compose-up

Порядок: postgres → `compose-db-migrate` → остальной стек (core/hub/fe). Initdb mounts на уже существующих volumes не переигрываются; migrate до seed core обязателен. Health wait, compose-fe-smoke, URL. Команда make compose-up.

## compose-up-prod

Тот же порядок migrate, профиль prod: fe-prod на порту 3000. Команда make compose-up-prod.

## compose-down и compose-ps

Остановка стека и статус контейнеров. Команды make compose-down, make compose-ps.

## compose-fe-smoke и compose-fe-prod-smoke

HTTP smoke frontend против core. Команды make compose-fe-smoke, make compose-fe-prod-smoke.

## compose-fe-refresh

Обновляет npm-зависимости внутри volume `fe_node_modules` и перезапускает сервис fe. По умолчанию спрашивает подтверждение. Без вопроса: `FE_REFRESH=1 make compose-fe-refresh`. Нужно после старта с новым lockfile, смены ветки или sync UI. Команда make compose-fe-refresh.

## run-hub, run-core, run, stop, smoke

Локальный запуск бинарников без Docker. run поднимает hub и core, smoke проверяет health и login. Команды make run, make stop, make smoke.

## compose-e2e

compose-up затем scripts/compose-e2e.sh. Команда make compose-e2e.

## integration-gate

npm test в fe, make test, make compose-e2e. Команда make integration-gate.

## ci-pr-fast и ci-pr

Локальная страховка required checks VDP CI на pull_request. `make ci-pr-fast`: docs-format-check, test-cd-scripts, test-adapters, integration-gate. `make ci-pr`: то же плюс узкий Playwright (login-form, user-submit, provider-acl, reject-path) — как `PLAYWRIGHT_ARGS` в job playwright на PR. Не заменяет `make release-gate` (полный suite / handover). Процесс агента: `.cursor/rules/vdp-ci-local-gate.mdc`.

## playwright-e2e и compose-playwright

Browser E2E через Docker. Команды make playwright-e2e, make compose-playwright.

## playwright-pilot

Быстрый UI-прогон default актёров (User/Manager/Provider/Root) по тегу `@pilot-flow` в `fe/e2e/pilot-form-flow.spec.ts`. Команда make playwright-pilot (`PLAYWRIGHT_ARGS='--grep @pilot-flow'` → compose-playwright).

## playwright-pilot-matrix

Полный UI-ladder Pilot Robot Matrix (`@pilot-matrix` в `fe/e2e/pilot-matrix-full-ladder.spec.ts`) без mid-payment API-seed. Фикстуры: `testdata/robot-fixtures`, env `VDP_ROBOT_FIXTURE_PACK` (default template). Команда make playwright-pilot-matrix.

## robot-matrix-check

Контракт матрицы и packs (manifest, matrix-rows, секция в e2e-coverage-matrix). Команда make robot-matrix-check. Входит в release-gate.

## docs-format-check

Проверка markdown в vdp/docs и vdp/README.md на запрещённую разметку. Команда make docs-format-check.

## release-gate

Pre-handover агрегат RH4. Последовательность make robot-matrix-check, make test-integration, make test-adapters, make integration-gate, pause, make playwright-e2e, make playwright-pilot-matrix, make docs-format-check. Требует docker postgres для compose и playwright. Команда make release-gate. CI эквивалент workflow vdp-release.yml. Не путать с каталогом vdp/release-gate — это Go API политики промоута, не эта Makefile-цель.
