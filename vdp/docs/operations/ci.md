# CI/CD для VDP

GitHub Actions — канон: merge в main, теги vdp-v, GHCR, deploy. GitLab (группа sandbox6902635) — вторичный форж: зеркало, параллельные MR, тот же тестовый контур. Настройка зеркала: [gitlab-setup.md](gitlab-setup.md). Памятка кнопки обновления: [how-to-update.md](how-to-update.md).

## Topology

Конвейер начинается с разработчика: GitHub PR или MR, плюс опционально GitLab MR.

Далее vdp-ci.yml с джобами fast, docs, integration (обязателен на каждом PR) и playwright (обязательный browser E2E на каждом PR и на main).

Далее vdp-release.yml: тег vdp-v запускает make release-gate (также release-gate job внутри vdp-images на теге).

Далее vdp-images.yml: immutable images в GHCR плюс copy в GitLab registry. На push в main job build-push ждёт успешный VDP CI для того же SHA (job wait VDP CI). На tag — release-gate без ожидания CI. workflow_dispatch принимает поле ref (ветка, тег или SHA) и не блокируется ожиданием CI. После push pin публикуется GitHub Release как каталог обновлений.

Далее vdp-deploy.yml: среда alpha автоматически только после Images с ветки main. Среды beta, gamma, demo, test — вручную. Gamma: Environment required reviewers.

Далее vdp-deploy-schedule.yml: cron читает GitHub Variables DEPLOY_MODE по среде.

Далее vdp-preview.yml: PR с label preview, образы с ветки, compose-проект pr-N на VM test, Caddy pr-N.preview.vedy.io, без сборки на хосте.

Далее vdp-lovable-sync.yml: fetch lionss888/vdp, открыть PR в vdp/fe, не merge в main.

Далее vdp-mirror-gitlab.yml: из GitHub в GitLab. CD на GitLab — волна 3.

Job fast: npm test в vdp/fe, make test, make test-adapters.

Job docs: docs-format-check, make test-cd-scripts.

Job integration: postgres service, ci-bootstrap-postgres.sh, make db-migrate (scripts/db-migrate-host.sh, тот же glob SQL что compose-db-migrate), make test-integration, make compose-up, compose-e2e.sh. GATEWAY_RATE_LIMIT=2000 в job env. Label integration больше не нужен для gate.

Job playwright: compose плюс make playwright-e2e. На PR узкий набор: login-form, user-submit, provider-acl, reject-path (PLAYWRIGHT_ARGS). На main / schedule / workflow_dispatch — полный suite (пустой PLAYWRIGHT_ARGS). GATEWAY_RATE_LIMIT=2000. Полная матрица браузеров не гоняется в этом job.

Images .github/workflows/vdp-images.yml — после green VDP CI на main (или release-gate на теге), либо dispatch с ref: build и push образов vdp-core, vdp-hub, vdp-docs, vdp-mail, vdp-sms, vdp-fe (production target) в GHCR по digest; copy digest в GitLab Container Registry.

Deploy .github/workflows/vdp-deploy.yml — GitHub Environments alpha, beta, gamma, demo, test; docker compose overlay pull, затем postgres → compose-db-migrate → up -d → restart core/hub, без флага --build. Initdb mounts alone are not enough on existing VM volumes.

Подготовка хоста: scripts/bootstrap-host.sh (Docker CE, пользователь deploy, каталог /opt/vdp, генерация .env.deploy со случайными секретами, ufw 22/80/443, Caddy c автоматическим HTTPS, каталог preview.d). Порты приложения биндятся на loopback через переменные с суффиксом BIND из .env.deploy; наружу смотрит только Caddy.

Секреты в GitHub Environment задаются по среде: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY. Консоль release-gate (волна 2) эти ключи в браузер не кладёт.

## Когда блокируется merge

PR на GitHub: обязательны fast (unit), docs format, integration (postgres + compose-e2e), playwright (browser E2E) (branch protection на main). Перед handover / gamma: зелёный release-gate локально либо на теге vdp-v*.

Оператор: Settings → Branches → правило для main → required checks с именами fast (unit), docs format, integration (postgres + compose-e2e), playwright (browser E2E).

Merge в main только на GitHub. GitLab main — mirror-only.

Hybrid alpha с ручной сборкой FE на VM не канон. Канон — pin из GHCR после green Images (которое на main ждёт green VDP CI).

## Локальные эквиваленты

Быстрый слой: cd vdp/fe и npm test; затем cd vdp и make test, make test-adapters.

Integration: make db-setup (локальный Postgres), make test-integration, make compose-up, ./scripts/compose-e2e.sh. Host migrate: make db-migrate (= scripts/db-migrate-host.sh).

Browser: make playwright-e2e. В CI на PR — четыре journey через PLAYWRIGHT_ARGS; на main — полный suite.

Pre-handover: make release-gate.

Образа: make image-build IMAGE_TAG=sha-local, затем make image-push (требует registry login).

Release overlay без сборки: VDP_CORE_IMAGE, VDP_HUB_IMAGE, VDP_DOCS_IMAGE, VDP_MAIL_IMAGE, VDP_SMS_IMAGE, VDP_FE_IMAGE. docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod up -d.

Deploy на VM с SSH: make deploy-alpha, make deploy-beta, make deploy-gamma (см. scripts/deploy-compose-release.sh). Preview: PR_NUMBER и pin, scripts/deploy-preview.sh.

## GitLab CI

Корневой .gitlab-ci.yml: stages идут в порядке fast, docs, integration, playwright, promote. Правила workflow пропускают pipeline от vdp-mirror-bot и коммиты с суффиксом skip mirror-loop на default branch. Integration и playwright на MR — manual optional. Promote пишет pin из GitLab registry и вызывает gitlab-promote.sh без пересборки, если в Environment заданы DEPLOY_HOST и DEPLOY_SSH_KEY.

## Staging smoke

Скрипт ./scripts/staging-smoke.sh с vars из staging-env.example. Входит в deploy workflow после health: кроме core/hub health проверяет seed login (user@vdp.local / user), чтобы schema drift не маскировался зелёным health.

## Rollback

[deploy-rollback.md](deploy-rollback.md) — pin предыдущего digest, compose pull и up -d, без SSH-патча контейнеров. Make-цели: make rollback-alpha, make rollback-beta, make rollback-gamma.

## Kubernetes (этап 2)

После зелёного Compose-CD на alpha: [k8s-roadmap.md](k8s-roadmap.md). Те же digest-образа, без пересборки.

## Честность готовности

Green CI/CD подтверждает регрессию и доставку артефакта: merge при зелёном PR + Images на main только после green CI ≈ alpha не уезжает с красной регрессией. Не заменяет prod vendor integrations, security sign-off, FE API product readiness. Full release-gate — на теге vdp-v* перед gamma. См. [known-gaps.md](../pilot/known-gaps.md).
