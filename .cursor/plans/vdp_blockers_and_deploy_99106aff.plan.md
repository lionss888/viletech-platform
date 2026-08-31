---
name: VDP blockers and deploy
overview: Снять три блокера, мешающие собрать и задеплоить VDP (удалённый Dockerfile фронта, закоммиченные node_modules, неработающий guard дев-секретов), затем зафиксировать репозиторий, выкатить сборку на облачный сервер через существующий GHCR + SSH конвейер и включить домен с TLS через Caddy.
todos:
  - id: restore-fe-dockerfile
    content: Восстановить vdp/fe/Dockerfile и .dockerignore из HEAD, проверить сборку production-образа и make image-build
    status: completed
  - id: repo-hygiene
    content: Убрать vdp/fe/node_modules из индекса git, создать корневой .gitignore, разобрать мусор и два .rej файла
    status: completed
  - id: fix-secrets-guard
    content: Инвертировать ValidateProduction в core и hub на allowlist локальных сред, добавить поле Environment в hub Config, написать table-driven тесты для обоих
    status: completed
  - id: green-gate
    content: Прогнать make test, make test-adapters и затем make release-gate
    status: completed
  - id: commit-repo
    content: Разложить 137 изменений по осмысленным коммитам, исправить расхождение имён сред в документации, запушить
    status: completed
  - id: docs-service-image
    content: Добавить docs-service в image-build-push.sh и release-overlay, чтобы деплой работал без сборки на VM
    status: completed
  - id: provision-vm
    content: Поднять VM, выполнить bootstrap-host.sh, задать loopback-бинды и ENVIRONMENT=alpha в .env.deploy, настроить GitHub Environment alpha с секретами DEPLOY_*
    status: completed
  - id: first-deploy
    content: Запустить vdp-images и vdp-deploy на alpha, проверить health и staging-smoke, прогнать happy-path Playwright против стенда
    status: in_progress
  - id: domain-tls
    content: Настроить A-запись, повторно выполнить bootstrap-host.sh с VDP_DOMAIN, проверить HTTPS, маршрутизацию /api и сквозной сценарий в браузере
    status: in_progress
isProject: false
---

> # План работ по VDP: блокеры, репозиторий, облако, домен
>
> ## Контекст
>
> Backend и FE-контур уже в рабочем состоянии: есть `lib/api` с JWT, разделение `/demo/*` и app-роутов, шесть Playwright-спеков против реального core. CD-конвейер (GHCR + SSH + Compose) написан и осмыслен. Мешают три конкретных дефекта рабочего дерева, каждый из которых ломает цепочку «сборка → облако → домен».
>
> ```mermaid
> flowchart LR
>   B1["Blocker 1\nfe/Dockerfile удалён"] --> Build[docker build FE]
>   Build --> Images["vdp-images.yml\nGHCR digest"]
>   Images --> Deploy["vdp-deploy.yml\nSSH + compose pull"]
>   Deploy --> Caddy["Caddy TLS\n/api -> 8080, / -> 3000"]
>   B2["Blocker 2\nnode_modules в git"] --> Repo[Чистый коммит]
>   Repo --> Images
>   B3["Blocker 3\nguard не ловит alpha/staging"] --> Deploy
> ```
>
> ---
>
> ## Волна 0. Три блокера
>
> ### 0.1. Вернуть Docker-сборку фронта
>
> Файлы `vdp/fe/Dockerfile` и `vdp/fe/.dockerignore` удалены из рабочего дерева, но присутствуют в HEAD. На них ссылаются [vdp/docker-compose.yml](vdp/docker-compose.yml) (сервисы `fe` target `development` и `fe-prod` target `production`) и [vdp/scripts/image-build-push.sh](vdp/scripts/image-build-push.sh) строка 34.
>
> - Восстановить оба файла из HEAD (`git checkout HEAD -- vdp/fe/Dockerfile vdp/fe/.dockerignore`).
> - Версия в HEAD актуальна: multi-stage `base` / `development` (Vite 5173) / `build` (`NITRO_PRESET=node-server`) / `production` (`node .output/server/index.mjs`, порт 3000) — совпадает с текущим [vdp/fe/vite.config.ts](vdp/fe/vite.config.ts).
> - Lockfile проверен и синхронизирован с `package.json`, поэтому `npm ci` внутри образа не упадёт.
>
> Проверка: `docker build --target production -f vdp/fe/Dockerfile vdp/fe` собирается; `cd vdp && make image-build` проходит все три образа.
>
> ### 0.2. Убрать node_modules из индекса и завести корневой .gitignore
>
> В индексе 31 214 файлов `vdp/fe/node_modules`, `.git` весит 251 МБ. `vdp/fe/.gitignore` их игнорирует, но они уже отслеживаются, поэтому игнор не действует. Корневого `.gitignore` в репозитории нет вообще.
>
> - `git rm -r --cached vdp/fe/node_modules` — файлы на диске остаются, дев не ломается, история не переписывается (решение пользователя).
> - Создать корневой `.gitignore`: `node_modules/`, `dist/`, `.output/`, `.nitro/`, `test-results/`, `.env`, `.env.*`, `.DS_Store`, `*.rej`, `*.orig`.
> - Удалить мусор рабочего дерева: `.dfc_after.txt`, `.dfc_before.txt`, `.docs-before.txt`, `vdp/fe/test-results/`, `vdp/fe/.lov-base.sh`, `vdp/fe/.lov-diff.sh`, `vdp/fe/.lov-port.sh`.
> - Отдельно разобрать два `.rej` (не удалять слепо): `vdp/fe/src/routes/demo/admin.tsx.rej` (9 строк) и `vdp/fe/src/routes/demo/documents.tsx.rej` (92 строки) — это не применившиеся косметические правки адаптивных Tailwind-классов из Lovable-патча. Решить: применить руками или отбросить, затем удалить файлы.
>
> Проверка: `git status --porcelain | wc -l` резко уменьшается; `git ls-files vdp/fe/node_modules | wc -l` возвращает 0.
>
> ### 0.3. Починить guard дев-секретов
>
> Сейчас проверка срабатывает только при `ENVIRONMENT` равном `production` или `prod`, тогда как [vdp/docker-compose.release.yml](vdp/docker-compose.release.yml) строки 23 и 31 задают `ENVIRONMENT: ${ENVIRONMENT:-staging}`, а `vdp-deploy.yml` работает со средами `alpha` / `beta` / `gamma`. Итог: публичный стенд поднимется с дев-секретом `vdp-core-dev-secret` без единой ошибки.
>
> Инвертировать логику — разрешать дев-секреты только для явно локальных сред:
>
> ```go
> func isLocalEnvironment(env string) bool {
> 	switch strings.ToLower(strings.TrimSpace(env)) {
> 	case "", "development", "dev", "local", "test", "ci":
> 		return true
> 	}
> 	return false
> }
> ```
>
> - [vdp/core/pkg/config/config.go](vdp/core/pkg/config/config.go) строки 57-70: заменить условие на `if isLocalEnvironment(c.Environment) { return nil }`. Дефолт `Environment` уже `development` (строка 29), а базовый compose переменную не задаёт, поэтому локальный стек не пострадает.
> - [vdp/hub/pkg/config/config.go](vdp/hub/pkg/config/config.go) строки 51-60: сейчас читает `os.Getenv("ENVIRONMENT")` прямо внутри `ValidateProduction`, из-за чего функция непроверяема без мутации окружения. Добавить поле `Environment` в `Config`, заполнять через `getEnv("ENVIRONMENT", "development")` по образцу core, и применять тот же `isLocalEnvironment`. Пустую строку обязательно оставить локальной, иначе hub не стартует в дев-compose.
> - Тесты: расширить [vdp/core/pkg/config/config_test.go](vdp/core/pkg/config/config_test.go) table-driven кейсами (`production`, `prod`, `staging`, `alpha`, `beta`, `gamma` отклоняют дев-секреты; `development`, `dev`, `test`, `ci`, пустое пропускают). Создать отсутствующий `vdp/hub/pkg/config/config_test.go` с аналогичной таблицей.
>
> Следствие для деплоя: на `alpha` контейнер не поднимется без настоящих `JWT_SECRET` и `HUB_SHARED_SECRET`. Это ожидаемо и согласуется с [vdp/scripts/bootstrap-host.sh](vdp/scripts/bootstrap-host.sh), который генерирует случайные секреты в `.env.deploy`.
>
> ### 0.4. Зелёный gate
>
> `cd vdp && make test`, затем `make test-adapters`. Перед подъёмом compose — спросить пользователя про `make compose-fe-refresh` (правило `vdp-fe-docker-пересборка`). Полный `make release-gate` — в конце волны 1.
>
> ---
>
> ## Волна 1. Зафиксировать репозиторий
>
> Ветка `d0-1`, remote `origin` = `github.com/lionss888/viletech-platform`, 137 изменённых путей. Разложить на осмысленные коммиты, не одним «wip»:
>
> - `chore(repo)`: untrack node_modules, корневой .gitignore, удаление мусора и `.rej`.
> - `fix(fe)`: восстановление Dockerfile и .dockerignore.
> - `fix(security)`: guard дев-секретов для всех сетевых сред + тесты core и hub.
> - `feat(fe)`: app-контур — `src/lib/api/*`, `src/lib/auth/session.tsx`, `platform-store.ts`, `platform-mode.ts`, `action-bridge.ts`, панели `RefundPanel`, `BankSettingsPanel`, `OrgProfileCard`, `VedAppShell`.
> - `test(fe)`: vitest-наборы и шесть Playwright-спеков, `playwright.config.ts`, `vitest.config.ts`.
> - `docs`: обновление `vdp/docs/*` и `vdp/rd0-baseline.md`.
> - `ci`: правки трёх workflow.
>
> Отдельно исправить расхождение документации: [vdp/docs/operations/gitlab-setup.md](vdp/docs/operations/gitlab-setup.md) и [vdp/docs/pilot/known-gaps.md](vdp/docs/pilot/known-gaps.md) говорят про среды `staging` / `production`, а workflow используют `alpha` / `beta` / `gamma`.
>
> Затем `make release-gate` (включает `test-integration`, `test-adapters`, `integration-gate`, Playwright, `docs-format-check`).
>
> ---
>
> ## Волна 2. Сборка на облачном сервере
>
> Конвейер уже есть: [.github/workflows/vdp-images.yml](.github/workflows/vdp-images.yml) пушит `vdp-core`, `vdp-hub`, `vdp-fe` в GHCR с дайджестами и отдаёт артефакт-пин, [.github/workflows/vdp-deploy.yml](.github/workflows/vdp-deploy.yml) по `workflow_run` делает rsync и SSH-деплой без сборки на VM.
>
> 1. Решить судьбу `docs-service`: он собирается только локально и не пушится в GHCR, а release-overlay его не переопределяет, поэтому при `--no-build` он не поднимется. Рекомендуется добавить его в [vdp/scripts/image-build-push.sh](vdp/scripts/image-build-push.sh) и в release-overlay по образцу core и hub, чтобы соблюсти правило «промоут без пересборки под прод».
> 2. Поднять Ubuntu-VM, добавить публичный ключ деплоя, выполнить `bootstrap-host.sh` (Docker, пользователь `deploy`, `/opt/vdp`, `.env.deploy` со случайными секретами, ufw 22/80/443).
> 3. В `.env.deploy` задать `CORE_BIND=127.0.0.1`, `HUB_BIND=127.0.0.1`, `FE_PROD_BIND=127.0.0.1`, `DB_BIND=127.0.0.1`, `DOCS_BIND=127.0.0.1`, чтобы наружу смотрел только Caddy, и `ENVIRONMENT=alpha`.
> 4. Создать GitHub Environment `alpha` с секретами `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`.
> 5. Запустить `vdp-images`, затем `vdp-deploy` на `alpha`; проверить `scripts/wait-release-health.sh` и `scripts/staging-smoke.sh`.
> 6. Прогнать один Playwright happy-path против стенда через `PLAYWRIGHT_BASE_URL`.
>
> ---
>
> ## Волна 3. Домен и TLS
>
> Домен у пользователя есть; демонстрация на публичном IP возможна, но это чистый HTTP с JWT и документами сделок в открытом канале, поэтому для передачи в тест берём домен.
>
> 1. A-запись на IP VM, дождаться распространения DNS.
> 2. Повторно выполнить `bootstrap-host.sh` с `VDP_DOMAIN=...`: ставится Caddy и генерируется Caddyfile, где `handle /api/*` идёт на `127.0.0.1:8080`, остальное на `127.0.0.1:3000`; сертификат Let's Encrypt выпускается при первом HTTPS-запросе.
> 3. Правки фронта не нужны: `VITE_API_BASE_URL` пуст, клиент бьёт в same-origin `/api/...`, а Caddy маршрутизирует это в core.
> 4. Приёмка: HTTPS отдаёт `/login`, логин под сид-аккаунтом работает, `GET /api/v1/health` зелёный, роль Provider не видит ПДн.
>
> ---
>
> ## Сверка с .cursor/rules
>
> Обязательные для этой работы:
>
> - `развертывание-и-доставка` — иммутабельный артефакт, промоут одного образа без пересборки, конфиг и секреты снаружи образа. Чеки: волна 0.1, волна 2.1.
> - `безопасность-ролей-и-данных` — дев-секреты недопустимы на любой сетевой среде, секреты не в образе и не в логах, least privilege по биндам. Чеки: волна 0.3, волна 2.3.
> - `go-testing` и `тесты-архитектуры` — table-driven unit на каждую экспортируемую функцию, `make release-gate` перед передачей. Чеки: волна 0.3, волна 1.
> - `честность-готовности` — не объявлять готовность без выполненного DoD; устранить расхождение между `заметки/vdp-готовность-мастер-2026-08-31.md` (утверждает «FE не подключён к API», что уже неверно) и `known-gaps.md`.
> - `vdp-fe-docker-пересборка` — спрашивать перед обновлением зависимостей фронта в Docker.
> - `правила-построения` — перепроверять себя после реализации, тесты к каждому изменению.
>
> Вне scope этой работы (следующая волна, зафиксировать как известные пробелы):
>
> - `allowed_actions` с сервера и устранение клиентской матрицы `actionsFor` в [vdp/fe/src/lib/ved/actions.ts](vdp/fe/src/lib/ved/actions.ts) — нарушение `чистая-архитектура` и `use-cases`, но требует парной правки core и FE.
> - Удаление мёртвой дублирующей матрицы `app-actions.ts` и `AppActionPanel.tsx`.
> - Перевод `attachDocToForm` в [vdp/fe/src/lib/api/files.ts](vdp/fe/src/lib/api/files.ts) с голого `fetch` на `apiFetch`.
> - Развёртывание Prometheus и семантических алертов (`устойчивость-и-наблюдаемость`), K8s (`k8s-roadmap.md`).
> - Открытые вопросы ТЗ к заказчику: отчёт при N поручениях, `REPORT_ACCEPTED`, порядок выбора ПА и курса, конфликт «Provider видит ИНН» с `ForbiddenPIIKeys`.
>
> ## Definition of Done
>
> - `docker build` фронта и `make image-build` проходят.
> - `git ls-files vdp/fe/node_modules` пусто, корневой `.gitignore` на месте, мусор и `.rej` разобраны.
> - Guard отклоняет дев-секреты на `staging` / `alpha` / `beta` / `gamma` / `production`, пропускает локальные среды; тесты core и hub зелёные.
> - `make release-gate` зелёный, изменения разложены по коммитам и запушены.
> - Стенд отвечает по HTTPS на домене, логин и один сквозной сценарий проходят в браузере.