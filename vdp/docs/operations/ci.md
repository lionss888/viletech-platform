# CI/CD для VDP

GitHub Actions владеет автоматической регрессией для каталога vdp. Локальные make-цели остаются эквивалентом для разработчика и pre-merge проверки.

## Topology

Workflow файл .github/workflows/vdp-ci.yml. Job fast выполняется на каждом pull request при изменении vdp или workflow. Job docs проверяет формат markdown в vdp/docs. Job integration зависит от fast и запускается на push в main, по расписанию nightly и на pull request с label integration. Job playwright зависит от integration и использует тот же триггер.

Job fast включает npm test в vdp/fe, make test для Go unit без build tag integration, make test-adapters для hub HTTP-контрактов docs и mail. Job integration поднимает service container postgres:16, выполняет make db-migrate, make test-integration с тегом integration, make compose-up и scripts/compose-e2e.sh без Playwright. Job playwright поднимает compose и make playwright-e2e в отдельном failure domain.

Release workflow .github/workflows/vdp-release.yml срабатывает на workflow_dispatch и теги vdp-v*. Он выполняет make release-gate с postgres service и полным docker-стеком.

## Когда блокируется merge

Pull request должен проходить job fast и docs. Integration и playwright не обязательны на каждом PR без label integration; рекомендуется branch protection required check fast на main. Перед pilot handover и релизом требуется зелёный release-gate локально или через vdp-release workflow.

## Локальные эквиваленты

Быстрый слой. Команда cd vdp/fe && npm test и cd vdp && make test && make test-adapters.

Integration слой. Команда cd vdp && make db-setup при локальном Postgres, затем make test-integration, make compose-up, ./scripts/compose-e2e.sh.

Browser слой. Команда cd vdp && make playwright-e2e после compose-up.

Pre-handover. Команда cd vdp && make release-gate агрегирует все gate per RH4.

Подробнее о слоях тестов см. [testing.md](../development/testing.md).

## GitLab mirror

В MVP реализован только GitHub Actions. Для GitLab CI рекомендуется stages fast, integration, playwright с docker:dind для compose и postgres service для make test-integration. Переменные DATABASE_URL_CORE и DATABASE_URL_HUB указывают на CI postgres. Secrets staging URL не хранятся в git.

## Staging smoke manual

Опциональный workflow_dispatch staging-smoke не входит в обязательный PR green. Требует secrets STAGING_DOCS_URL, STAGING_MAIL_URL и аналогов вне репозитория. Используется только перед UAT на staging окружении. См. [staging-checklist.md](staging-checklist.md).

## Честность готовности

Green CI подтверждает автоматическую регрессию unit, postgres integration, compose API E2E и частичный browser suite. Не заменяет prod vendor integrations, security sign-off и operational alerting. См. [known-gaps.md](../pilot/known-gaps.md).
