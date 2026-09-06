---
name: Fix CI docs playwright
overview: "Починить красный VDP CI на пути в main: docs-format (backticks/bold в docs/operations) и playwright E2E (npm ci в compose-playwright). Scope — текущая ветка d2 / PR с migrate+кодом; после зелёного CI — merge и авто-выкат на alpha.\""
todos:
  - id: w1-docs-format
    content: Убрать backticks/bold в 4 operations md; make docs-format-check OK
    status: pending
  - id: w2-playwright-npm
    content: Диагноз npm ci в compose-playwright + фикс (lock/rm node_modules/optional deps); CI=true playwright green
    status: pending
  - id: w3-push-verify
    content: Push, дождаться зелёного VDP CI; merge path к main/alpha
    status: pending
isProject: false
---

# План: починить VDP CI (docs + playwright)

## Контекст

Красный прогон — **не** «настройки PR», а реализация/доки/скрипты. На локальной ветке `d2` сейчас есть и migrate-gate (`c9c002d7`), и process-roles (`ff829c86`). CI PR #15 падает на двух обязательных job:

- **docs format** — `make docs-format-check` (exit 2)
- **playwright** — `make playwright-e2e` → [`vdp/scripts/compose-playwright.sh`](vdp/scripts/compose-playwright.sh) → `npm ci` (exit 2)
- **integration** на PR skipped без label — не чинить

Правила: `правила-построения`, `тесты-архитектуры`, `развертывание-и-доставка`, `честность-готовности`. Документацию только правим под существующий линтер (не плодим новые md). Plan-файл process_policy **не** трогаем.

## W1 — Docs format (известный список)

Линтер: [`vdp/scripts/docs-format-check.sh`](vdp/scripts/docs-format-check.sh) — вне `docs/development/` запрещены backticks и `**bold**`.

Локально подтверждены **ровно 6 FAIL / 4 файла** (после правки migrate-доков):

| Файл | Что убрать |
|------|------------|
| [`vdp/docs/operations/ci.md`](vdp/docs/operations/ci.md) :29, :67 | `` `compose-db-migrate` ``, `` `user@…` `` / `` `user` `` |
| [`vdp/docs/operations/deploy-rollback.md`](vdp/docs/operations/deploy-rollback.md) :37 | backticks вокруг COMPOSE_FILES / путей скриптов |
| [`vdp/docs/operations/docker-compose.md`](vdp/docs/operations/docker-compose.md) :49 | backticks + `**only**` |
| [`vdp/docs/operations/how-to-update.md`](vdp/docs/operations/how-to-update.md) :27 | backticks вокруг core/migrations, hub/migrations, compose-db-migrate |

Замена: тот же смысл обычным текстом (как в соседних абзацах operations).  
Gate: `cd vdp && make docs-format-check` → OK.

## W2 — Playwright / npm ci

Симптом: в job `Compose up + required User journeys` падает [`compose-playwright.sh`](vdp/scripts/compose-playwright.sh) строка с `npm ci --ignore-scripts`; в логе виден хвост `npm help ci` — реальная причина обычно **выше** help.

Конкретный подход (без гадания в CI вслепую):

1. Локально/в том же образе воспроизвести:
   - `docker run --rm -v "$PWD/vdp/fe:/app" -w /app mcr.microsoft.com/playwright:v1.62.1-jammy bash -lc 'npm ci --ignore-scripts'`
   - зафиксировать первую осмысленную строку `npm error` (не help-footer).
2. Типичные фиксы под этот репозиторий (применить по факту ошибки):
   - **lockfile/package.json рассинхрон** → `npm install` в `vdp/fe` и закоммитить согласованный `package-lock.json`;
   - **mount host `node_modules` мешает** → в CI-ветке скрипта перед `npm ci`: `rm -rf node_modules` (уже почти так задумано для Linux; сделать явным при `CI=true`);
   - **optional darwin-only** [`@rollup/rollup-darwin-x64`](vdp/fe/package.json) ломает `npm ci` на linux → убрать из optionalDependencies или заменить на платформо-агностичный rollup optional set;
   - улучшить вывод: `npm ci --ignore-scripts` без глотания stderr; при fail печатать `npm -v` / `node -v`.
3. Gate локально: `cd vdp && make compose-up && CI=true PLAYWRIGHT_ARGS='e2e/login-form.spec.ts e2e/user-submit.spec.ts' make playwright-e2e` (или эквивалент в Docker как в CI).

Не ослаблять gate (не skip playwright в workflow) — чинить причину.

## W3 — Прогон и merge path

1. Push фикса на ту же ветку PR (или `d2`, если PR из неё).
2. Дождаться зелёных **fast**, **docs format**, **playwright**.
3. Merge в `main` → авто **VDP Images** → авто **VDP Deploy** alpha.
4. Проверка alpha: `GET /api/v1/process-roles` не 404 (если в merge попал process-roles); health + seed login (migrate-gate).

## Вне scope

- Менять branch protection / «просто смержить с красным CI»
- BPM / правки process_policy plan.md
- FE docker refresh без вопроса пользователю (`vdp-fe-docker-пересборка`)

## Порядок

W1 → W2 → W3.
