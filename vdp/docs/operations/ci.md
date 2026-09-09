# CI/CD для VDP

GitHub Actions — канон: merge в main, теги vdp-v, GHCR, deploy. GitLab (группа [vdp888](https://gitlab.com/vdp888)) — вторичный форж: зеркало, параллельные MR, тот же тестовый контур. Настройка зеркала: [gitlab-setup.md](gitlab-setup.md) (кратко) и [../development/gitlab-setup.md](../development/gitlab-setup.md) (howto). Памятка кнопки обновления: [how-to-update.md](how-to-update.md).

## Topology

Конвейер начинается с разработчика: GitHub PR или MR, плюс опционально GitLab MR.

Далее .github/workflows/vdp-ci.yml с джобами fast (unit), docs format, integration (postgres + compose-e2e) и playwright (browser E2E).

Job fast (unit): npm test в vdp/fe, make test, make test-adapters на каждом PR, push в main и schedule.

Job docs format: make docs-format-check и make test-cd-scripts.

Job integration (postgres + compose-e2e): на каждом PR и на main (не label-only). Postgres service, make db-migrate, make test-integration, make compose-up, compose-e2e.sh. Label integration больше не нужен для gate.

Job playwright (browser E2E): compose плюс make playwright-e2e. Переменная PLAYWRIGHT_ARGS: на pull_request — узкий набор e2e/login-form.spec.ts e2e/user-submit.spec.ts e2e/provider-acl.spec.ts e2e/reject-path.spec.ts; на push main / schedule / workflow_dispatch — пустая строка (полный suite).

В integration и playwright jobs задаётся GATEWAY_RATE_LIMIT=2000 (compose подставляет ${GATEWAY_RATE_LIMIT:-2000}), чтобы длинный suite не ловил 429.

Далее .github/workflows/vdp-images.yml: immutable images в GHCR плюс copy в GitLab registry. На push в main job wait for VDP CI (main push) блокирует build-push, пока vdp-ci.yml для того же SHA не завершится success (scripts/wait-vdp-ci.sh). На workflow_dispatch и тег vdp-v* ожидание CI не требуется (тег уже гоняет release-gate).

Далее .github/workflows/vdp-deploy.yml: среда alpha автоматически только после Images с ветки main. Среды beta, gamma, demo, test — вручную. Gamma: Environment required reviewers.

Далее vdp-deploy-schedule.yml: cron читает GitHub Variables DEPLOY_MODE по среде.

Далее vdp-preview.yml: PR с label preview, образы с ветки, compose-проект pr-N на VM test, Caddy pr-N.preview.vedy.io, без сборки на хосте.

Далее vdp-lovable-sync.yml: fetch GitHub lionss888/vdp (Lovable), открыть PR в vdp/fe, не merge в main. На GitLab тот же UI-репо лежит как [vdp888/vdp](https://gitlab.com/vdp888/vdp) — отдельно от зеркала монорепо [vdp888/viletech-platform](https://gitlab.com/vdp888/viletech-platform); см. [gitlab-setup.md](gitlab-setup.md) и [../development/gitlab-setup.md](../development/gitlab-setup.md).

Далее vdp-mirror-gitlab.yml: GitHub monorepo → https://gitlab.com/vdp888/viletech-platform. Не путать с Lovable-репо vdp888/vdp. CD на GitLab — волна 3.

Images: build и push образов vdp-core, vdp-hub, vdp-docs, vdp-extraction, vdp-mail, vdp-sms, vdp-fe (production target) в GHCR по digest; copy digest в GitLab Container Registry. После push pin публикуется GitHub Release как каталог обновлений. workflow_dispatch принимает поле ref (ветка, тег или SHA).

Deploy: GitHub Environments alpha, beta, gamma, demo, test; docker compose overlay pull, затем postgres → compose-db-migrate → up -d → restart core/hub, без флага --build. Initdb mounts alone are not enough on existing VM volumes.

Подготовка хоста: scripts/bootstrap-host.sh (Docker CE, пользователь deploy, каталог /opt/vdp, генерация .env.deploy со случайными секретами, ufw 22/80/443, Caddy c автоматическим HTTPS, каталог preview.d). Порты приложения биндятся на loopback через переменные с суффиксом BIND из .env.deploy; наружу смотрит только Caddy.

Секреты в GitHub Environment задаются по среде: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY.

## Status contract (UI)

Критичные статусы в Playwright ассертятся по data-testid=status-badge и data-status (канонический код домена), не по русскому title (process-roles меняют copy).

## Когда блокируется merge

PR на GitHub: обязательны required checks с именами fast (unit), docs format, integration (postgres + compose-e2e), playwright (browser E2E). Оператор: Settings → Branches → правило для main.

Перед handover / gamma: зелёный release-gate локально либо на теге vdp-v* в Images.

Merge в main только на GitHub. GitLab main — mirror-only.

Путь на alpha: merge main → зелёный VDP CI → Images build-push (после wait-for-ci) → Deploy alpha. Красный CI на том же SHA не должен порождать digest для alpha.

Hybrid alpha с ручной сборкой FE на VM не канон. Канон — pin из GHCR.

## Локальные эквиваленты

Быстрый слой: cd vdp/fe и npm test; затем cd vdp и make test, make test-adapters.

Migration (host = compose glob): make db-migrate делегирует в scripts/db-migrate-host.sh (все core/migrations/*.sql + hub). Continuity E2E: scripts/lib/e2e-continuity.sh, sourced из compose-e2e.sh.

Integration: make db-setup (локальный Postgres), make test-integration, make compose-up, ./scripts/compose-e2e.sh.

Browser: make playwright-e2e. В CI PR — через PLAYWRIGHT_ARGS (четыре спека выше).

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

Green CI/CD подтверждает регрессию и доставку артефакта: merge при зелёном PR + Images на main только после green CI ≈ alpha не уезжает с красной регрессией. Не заменяет prod vendor UAT, security sign-off, FE API product readiness. Full release-gate по-прежнему на теге vdp-v* перед gamma. См. [known-gaps.md](../pilot/known-gaps.md).
