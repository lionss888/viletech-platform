# CI/CD для VDP

GitHub Actions — канон: merge в main, теги vdp-v, GHCR, deploy. GitLab (группа sandbox6902635) — вторичный форж: зеркало, параллельные MR, тот же тестовый контур. Настройка зеркала: [gitlab-setup.md](gitlab-setup.md). Памятка кнопки обновления: [how-to-update.md](how-to-update.md).

## Topology

Конвейер начинается с разработчика: GitHub PR или MR, плюс опционально GitLab MR.

Далее vdp-ci.yml с джобами fast, docs, integration (условно) и playwright (обязательный User-journey на каждом PR и на main).

Далее vdp-release.yml: тег vdp-v запускает make release-gate.

Далее vdp-images.yml: immutable images в GHCR плюс copy в GitLab registry. workflow_dispatch принимает поле ref (ветка, тег или SHA). После push pin публикуется GitHub Release как каталог обновлений.

Далее vdp-deploy.yml: среда alpha автоматически только после Images с ветки main. Среды beta, gamma, demo, test — вручную. Gamma: Environment required reviewers.

Далее vdp-deploy-schedule.yml: cron читает GitHub Variables DEPLOY_MODE по среде.

Далее vdp-preview.yml: PR с label preview, образы с ветки, compose-проект pr-N на VM test, Caddy pr-N.preview.vedy.io, без сборки на хосте.

Далее vdp-lovable-sync.yml: fetch lionss888/vdp, открыть PR в vdp/fe, не merge в main.

Далее vdp-mirror-gitlab.yml: из GitHub в GitLab. CD на GitLab — волна 3.

Job fast: npm test в vdp/fe, make test, make test-adapters. Job integration: postgres service, ci-bootstrap-postgres.sh, make db-migrate, make test-integration, make compose-up, compose-e2e.sh. Job playwright: compose плюс make playwright-e2e с двумя спеками login-form и user-submit (ролевые локаторы). Полная матрица браузера не гоняется в этом job.

Images .github/workflows/vdp-images.yml — после green gate на теге или push в main, либо dispatch с ref: build и push образов vdp-core, vdp-hub, vdp-docs, vdp-mail, vdp-sms, vdp-fe (production target) в GHCR по digest; copy digest в GitLab Container Registry.

Deploy .github/workflows/vdp-deploy.yml — GitHub Environments alpha, beta, gamma, demo, test; docker compose overlay pull, затем postgres → `compose-db-migrate` → up -d → restart core/hub, без флага --build. Initdb mounts alone are not enough on existing VM volumes.

Подготовка хоста: scripts/bootstrap-host.sh (Docker CE, пользователь deploy, каталог /opt/vdp, генерация .env.deploy со случайными секретами, ufw 22/80/443, Caddy c автоматическим HTTPS, каталог preview.d). Порты приложения биндятся на loopback через переменные с суффиксом BIND из .env.deploy; наружу смотрит только Caddy.

Секреты в GitHub Environment задаются по среде: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY. Консоль release-gate (волна 2) эти ключи в браузер не кладёт.

## Когда блокируется merge

PR на GitHub: обязательны fast, docs и playwright (branch protection на main). Integration — на main, по label integration или nightly. Перед handover: зелёный release-gate локально либо vdp-release на теге.

Оператор: в Settings, Branches, правило для main включить required checks с именами fast (unit), docs format, playwright (browser E2E).

Merge в main только на GitHub. GitLab main — mirror-only.

Hybrid alpha с ручной сборкой FE на VM не канон. Канон — pin из GHCR.

## Локальные эквиваленты

Быстрый слой: cd vdp/fe и npm test; затем cd vdp и make test, make test-adapters.

Integration: make db-setup (локальный Postgres), make test-integration, make compose-up, ./scripts/compose-e2e.sh.

Browser: make playwright-e2e. В CI те же два journey через переменную PLAYWRIGHT_ARGS.

Pre-handover: make release-gate.

Образа: make image-build IMAGE_TAG=sha-local, затем make image-push (требует registry login).

Release overlay без сборки: VDP_CORE_IMAGE, VDP_HUB_IMAGE, VDP_DOCS_IMAGE, VDP_MAIL_IMAGE, VDP_SMS_IMAGE, VDP_FE_IMAGE. docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod up -d.

Deploy на VM с SSH: make deploy-alpha, make deploy-beta, make deploy-gamma (см. scripts/deploy-compose-release.sh). Preview: PR_NUMBER и pin, scripts/deploy-preview.sh.

## GitLab CI

Корневой .gitlab-ci.yml: stages идут в порядке fast, docs, integration, playwright, promote. Правила workflow пропускают pipeline от vdp-mirror-bot и коммиты с суффиксом skip mirror-loop на default branch. Integration и playwright на MR — manual optional. Promote пишет pin из GitLab registry и вызывает gitlab-promote.sh без пересборки, если в Environment заданы DEPLOY_HOST и DEPLOY_SSH_KEY.

## Staging smoke

Скрипт ./scripts/staging-smoke.sh с vars из staging-env.example. Входит в deploy workflow после health: кроме core/hub health проверяет seed login (`user@vdp.local` / `user`), чтобы schema drift не маскировался зелёным health.

## Rollback

[deploy-rollback.md](deploy-rollback.md) — pin предыдущего digest, compose pull и up -d, без SSH-патча контейнеров. Make-цели: make rollback-alpha, make rollback-beta, make rollback-gamma.

## Kubernetes (этап 2)

После зелёного Compose-CD на alpha: [k8s-roadmap.md](k8s-roadmap.md). Те же digest-образа, без пересборки.

## Честность готовности

Green CI/CD подтверждает регрессию и доставку артефакта. Не заменяет prod vendor integrations, security sign-off, FE API product readiness. Своего клиента управления нет до волны 2. См. [known-gaps.md](../pilot/known-gaps.md).
