# CI/CD для VDP

GitHub Actions — канон: merge в main, теги vdp-v*, GHCR, deploy. GitLab (группа sandbox6902635) — вторичный форж: зеркало, параллельные MR, тот же тестовый контур. Настройка зеркала: [gitlab-setup.md](gitlab-setup.md).

## Topology

Конвейер начинается с разработчика: GitHub PR или MR, плюс опционально GitLab MR.

Далее vdp-ci.yml с джобами fast, docs, а также integration и playwright, которые запускаются условно.

Далее vdp-release.yml: тег vdp-v* запускает make release-gate.

Далее vdp-images.yml: immutable images в GHCR плюс copy в GitLab registry.

Далее vdp-deploy.yml: среда alpha автоматически, среды beta и gamma вручную с approval.

Далее vdp-mirror-gitlab.yml: из GitHub в GitLab, без CD на стороне GitLab.

Workflow .github/workflows/vdp-ci.yml. Job fast на каждом PR при изменении каталога vdp или самого workflow. Job docs — формат markdown. Job integration — postgres плюс compose-e2e (main, nightly, PR с label integration). Job playwright — browser E2E после integration.

Job fast: npm test в vdp/fe, make test, make test-adapters. Job integration: postgres service, ci-bootstrap-postgres.sh, make db-migrate, make test-integration, make compose-up, compose-e2e.sh. Job playwright: compose плюс make playwright-e2e.

Release .github/workflows/vdp-release.yml — workflow_dispatch и теги vdp-v*, оба ведут к make release-gate.

Images .github/workflows/vdp-images.yml — после green gate на теге или push в main: build и push образов vdp-core, vdp-hub, vdp-fe (production target) в GHCR по digest; copy digest в GitLab Container Registry.

Deploy .github/workflows/vdp-deploy.yml — GitHub Environments alpha (авто из main), beta и gamma (вручную, approval); docker compose -f docker-compose.release.yml pull, затем up -d, без флага --build; staging-smoke.sh на всех средах кроме gamma.

Подготовка хоста: scripts/bootstrap-host.sh (Docker CE, пользователь deploy, каталог /opt/vdp, генерация .env.deploy со случайными секретами, ufw 22/80/443, Caddy c автоматическим HTTPS). Порты приложения биндятся на loopback через переменные с суффиксом _BIND из .env.deploy; наружу смотрит только Caddy.

Secrets в GitHub Environment задаются по среде: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY.

## Когда блокируется merge

PR на GitHub: обязательны fast и docs (branch protection). Integration и playwright — на main, по label integration или nightly. Перед handover: зелёный release-gate локально либо vdp-release на теге.

Merge в main только на GitHub. GitLab main — mirror-only.

## Локальные эквиваленты

Быстрый слой: cd vdp/fe и npm test; затем cd vdp и make test, make test-adapters.

Integration: make db-setup (локальный Postgres), make test-integration, make compose-up, ./scripts/compose-e2e.sh.

Browser: make playwright-e2e.

Pre-handover: make release-gate.

Образа: make image-build IMAGE_TAG=sha-local, затем make image-push (требует registry login).

Release overlay без сборки: VDP_CORE_IMAGE=... VDP_HUB_IMAGE=... VDP_FE_IMAGE=... docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod up -d.

Deploy на VM с SSH: make deploy-alpha, make deploy-beta, make deploy-gamma (см. scripts/deploy-compose-release.sh).

## GitLab CI

Корневой .gitlab-ci.yml: stages идут в порядке fast, docs, integration, playwright. Правила workflow пропускают pipeline от vdp-mirror-bot и коммиты с суффиксом [skip mirror-loop] на default branch. Integration и playwright на MR — manual optional.

GitLab не деплоит. Секреты сред только в GitHub Environments.

## Staging smoke

Скрипт ./scripts/staging-smoke.sh с vars из staging-env.example. Входит в deploy workflow после health.

## Rollback

[deploy-rollback.md](deploy-rollback.md) — pin предыдущего digest, compose pull и up -d, без SSH-патча контейнеров. Make-цели: make rollback-alpha, make rollback-beta, make rollback-gamma.

## Kubernetes (этап 2)

После зелёного Compose-CD на alpha: [k8s-roadmap.md](k8s-roadmap.md). Те же digest-образа, без пересборки.

## Честность готовности

Green CI/CD подтверждает регрессию и доставку артефакта. Не заменяет prod vendor integrations, security sign-off, FE↔API product readiness. См. [known-gaps.md](../pilot/known-gaps.md).
