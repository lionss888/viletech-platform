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

Порядок: postgres → `compose-db-migrate` → остальной стек (core/hub/fe). Initdb mounts на уже существующих volumes не переигрываются; migrate до seed core обязателен. Postgres `--wait` и полный `up -d --build` идут через `scripts/compose-up-with-retry.sh` (гонки Desktop: exit 0 на recreate, No such container). Migrate ждёт стабильный ready и nudges сервис при простое. Health wait, compose-fe-smoke, URL. Команда make compose-up.

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

Локальная страховка required checks VDP CI на pull_request. `make ci-pr-fast`: docs-format-check, test-cd-scripts, test-adapters, integration-gate. `make ci-pr`: то же плюс узкий Playwright (login-form, user-submit, provider-acl, reject-path) — как job playwright на PR. `make ci-pr-pilot`: ci-pr плюс тег @pilot-matrix (паритет GitHub path-filter). `make ci-main`: ci-pr-fast плюс полный Playwright без фильтра (как job playwright на push в main). Не заменяет `make release-gate` (полный suite / handover). Процесс агента: `.cursor/rules/vdp-ci-local-gate.mdc`. Local QG: PR Gate (smoke) это ci-pr, PR Gate (Pilot) это ci-pr-pilot, Main push (полный браузер) это ci-main.

## playwright-e2e и compose-playwright

Browser E2E через Docker. Команды make playwright-e2e, make compose-playwright.

После suite (успех или fail) compose-playwright вызывает POST probe-data wipe от root, чтобы не оставлять следы заявок. Отключить: E2E_WIPE_AFTER=0. Wipe разрешён на local/development/test/ci/alpha; кнопка Root «Очистить все заявки» на /testing для ручного QA.

## ocr-path-gate

До ручной проверки клиентом по распознаванию. Нужен уже поднятый compose. Сначала extraction-docling-smoke, затем Playwright только e2e/ocr-wizard-path.spec.ts (баннер уходит из pending). Команда make ocr-path-gate. Local QG кнопка Путь распознавания. Подробности в ocr-path-gate.md. Для merge-ready после смены этого e2e нужен make ci-main.

## playwright-pilot

Быстрый UI-прогон default актёров (User/Manager/Provider/Root) по тегу `@pilot-flow` в `fe/e2e/pilot-form-flow.spec.ts`. Команда make playwright-pilot (`PLAYWRIGHT_ARGS='--grep @pilot-flow'` → compose-playwright).

## playwright-pilot-matrix

Полный UI-ladder Pilot Robot Matrix (`@pilot-matrix` в `fe/e2e/pilot-matrix-full-ladder.spec.ts`) без mid-payment API-seed. Фикстуры: `testdata/robot-fixtures`, env `VDP_ROBOT_FIXTURE_PACK` (default template). Команда make playwright-pilot-matrix.

## robot-matrix-check

Контракт матрицы и packs (manifest, matrix-rows, секция в e2e-coverage-matrix). Команда make robot-matrix-check. Входит в release-gate.

## perf-gate

Замер go test -bench проверки перехода статуса заявки. Красный, если ns/op выше бюджета. Команда make perf-gate. Входит в фазу 1 ci-pr-fast.

## docs-format-check

Проверка markdown в vdp/docs и vdp/README.md на запрещённую разметку. Команда make docs-format-check. Входит в `precommit-gate` и в `ci-pr` / `release-gate`.

## precommit-gate

Локальный хук-агрегат: сначала `check-env-parity` (Node и Go), затем `docs-format-check`, затем `make test`, затем path-aware `cd fe && npm test` только если в staged есть `fe/` или `vdp/fe/`, затем TG notify только при fail. Команда `make precommit-gate`. Хук `.githooks/pre-commit` вызывает тот же target. Не заменяет `ci-pr`.

## compose-db-migrate

Накатывает core/hub `*.sql` в compose Postgres. Ждёт стабильный ready (post-initdb restart, до WAIT_PG_MAX секунд) с nudge `up -d` при долгом not-ready и ретраит psql при `shutting down` / `starting up`. Команда `make compose-db-migrate`; вызывается из `compose-up` / release up.

## release-gate

Pre-handover агрегат RH4. Последовательность make robot-matrix-check, make test-integration, make test-adapters, make integration-gate, pause, make playwright-e2e, make playwright-pilot-matrix, make docs-format-check. Требует docker postgres для compose и playwright. Команда make release-gate. CI эквивалент workflow vdp-release.yml. Не путать с каталогом vdp/release-gate — это Go API политики промоута, не эта Makefile-цель.
