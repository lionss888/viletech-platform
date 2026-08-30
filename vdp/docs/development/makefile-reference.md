# Справочник Makefile

Все команды выполняются из каталога vdp.

## deps

Загрузка Go-модулей core, hub и shared. Команда make deps.

## test

Unit-тесты Go в core и hub без build tag integration. Команда make test.

## test-integration

Postgres integration tests с тегом integration в core store outbox и hub inbox. Требует DATABASE_URL_CORE и DATABASE_URL_HUB. Команда make test-integration.

## test-adapters

Hub adapter HTTP tests docs mail. Команда make test-adapters. Входит в CI job fast.

## build

Сборка bin/vdp-core и bin/vdp-hub. Команда make build.

## db-setup и db-migrate

Локальный Postgres: создание ролей vdp_core и vdp_hub, баз vdp_core и vdp_hub, применение migrations. Команды make db-setup и make db-migrate.

## compose-up

docker compose up с Postgres, core, hub, fe dev на порту 5173. Health wait, compose-fe-smoke, вывод URL. Команда make compose-up.

## compose-up-prod

Профиль prod: fe-prod на порту 3000. Команда make compose-up-prod.

## compose-down и compose-ps

Остановка стека и статус контейнеров. Команды make compose-down, make compose-ps.

## compose-fe-smoke и compose-fe-prod-smoke

HTTP smoke frontend против core. Команды make compose-fe-smoke, make compose-fe-prod-smoke.

## run-hub, run-core, run, stop, smoke

Локальный запуск бинарников без Docker. run поднимает hub и core, smoke проверяет health и login. Команды make run, make stop, make smoke.

## compose-e2e

compose-up затем scripts/compose-e2e.sh. Команда make compose-e2e.

## integration-gate

npm test в fe, make test, make compose-e2e. Команда make integration-gate.

## playwright-e2e и compose-playwright

Browser E2E через Docker. Команды make playwright-e2e, make compose-playwright.

## docs-format-check

Проверка markdown в vdp/docs и vdp/README.md на запрещённую разметку. Команда make docs-format-check.

## release-gate

Pre-handover агрегат RH4. Последовательность make test-integration, make test-adapters, make integration-gate, make playwright-e2e, make docs-format-check. Требует docker postgres для compose и playwright. Команда make release-gate. CI эквивалент workflow vdp-release.yml.
