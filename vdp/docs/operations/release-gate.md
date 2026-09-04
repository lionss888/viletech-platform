# Консоль ворот выпуска

Отдельное приложение на delivery.vedy.io. Визуал как у кабинетов VDP, но не кабинет заявки. API не ходит SSH на продуктовые VM: только dispatch GitHub Actions или GitLab pipeline. Секреты DEPLOY_SSH_KEY остаются в Environments.

## Роли

Роль viewer. Смотрит каталог и среды.

Роль deployer-alpha-preview. Обновляет alpha, demo, test и preview.

Роль deployer-beta. Плюс beta.

Роль deployer-gamma. Плюс gamma, только тег vdp-v.

Роль policy-admin. Расписание и approvers.

## Auth

Порядок внутри эпика: GitHub OAuth, затем GitLab OAuth, затем локальные учётки консоли. Локальные seed для dev: admin@vdp.local, alpha@vdp.local, gamma@vdp.local, viewer@vdp.local.

## Compose

Файл docker-compose.release-gate.yml поднимает API и nginx-консоль. Образ консоли и API входят в pin как VDP_RELEASE_GATE_IMAGE и VDP_RELEASE_GATE_CONSOLE_IMAGE.

## Тесты

Go: cd vdp/release-gate и go test ./... Матрица роли на среду и smart stub адаптеров GitHub и GitLab.

Консоль: npm test и playwright journey список затем Обновить alpha.
