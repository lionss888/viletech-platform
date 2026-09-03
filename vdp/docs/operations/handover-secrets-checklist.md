# Handover secrets checklist (gate before customer transfer)

Подпись ответственного: _________________ Дата: _________

Этот документ закрывает gate ротации секретов и доступов на этапе передачи заказчику. Использовать после фразы «пора передавать заказчику», до подписи security-signoff-checklist.md и staging go-live. Связанные документы: security-signoff-checklist.md, staging-checklist.md, ci.md, gitlab-setup.md, deploy-rollback.md.

## Контрольный вопрос (старт gate)

Ответ «да» на все пункты ниже обязателен перед передачей. Любой «нет» — gate не закрыт.

Вопрос первый. Все секреты, которые когда-либо попадали в чат, логи, скриншоты или временные файлы на рабочей машине разработчика, считаются скомпрометированными и будут заменены до передачи. Статус не выполнено.

Вопрос второй. GitHub PAT с правами repo, workflow и write:packages, использованный для отладки CI/CD, отозван; новый токен создан только у заказчика или в его secret store, не у подрядчика. Статус не выполнено.

Вопрос третий. SSH-ключ DEPLOY_SSH_KEY в GitHub Environment alpha, beta и gamma принадлежит заказчику; ключи подрядчика (в том числе vdp_deploy_ed25519 и vdp_ci_ed25519 с локальной машины) удалены с authorized_keys пользователя deploy на всех хостах. Статус не выполнено.

Вопрос четвёртый. JWT_SECRET и HUB_SHARED_SECRET на каждом хосте (.env.deploy) сгенерированы заново заказчиком; после ротации выполнен redeploy pinned digest без пересборки образов. Статус не выполнено.

Вопрос пятый. Доступы Selectel, reg.ru (DNS vedy.io), GitHub organization и GitLab group sandbox6902635 переданы заказчику; учётные записи подрядчика отозваны или понижены до read-only по согласованию. Статус не выполнено.

Вопрос шестой. Заказчик подтвердил, что знает где хранятся секреты (GitHub Environments, .env.deploy на VM), кто владелец on-call и как выполнить rollback по deploy-rollback.md. Статус не выполнено.

## Что допустимо оставить на этапе отладки (до gate)

На этапе alpha-отладки допустимо временно использовать PAT подрядчика и существующие deploy-ключи, пока gate не объявлен. Это не отменяет gate: при передаче всё из блока «Контрольный вопрос» выполняется обязательно.

Файл ~/Downloads/gh_token.txt или аналог на машине разработчика должен быть удалён после ротации PAT.

Парольная фраза от deploy-ключа подрядчика не должна попадать в GitHub Secrets; для CI используется отдельный ключ без passphrase (см. staging-checklist.md, раздел Alpha host bootstrap).

## GitHub и CI/CD

PAT Developer settings Personal access tokens: отозвать все токены подрядчика с доступом к репозиторию viletech-platform. Статус не выполнено.

Создать новый PAT или fine-grained token у владельца репозитория заказчика; scopes минимум repo, workflow, write:packages для GHCR; read:org если нужен gh CLI для org. Статус не выполнено.

GitHub Environments alpha, beta, gamma: обновить DEPLOY_SSH_KEY на ключ заказчика; проверить DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH. Статус не выполнено.

Секрет GITLAB_MIRROR_TOKEN в repository secrets: ротация; новый GitLab PAT с write_repository только у заказчика. Статус не выполнено.

Убедиться, что gamma environment имеет required reviewers из команды заказчика. Статус не выполнено.

## SSH и хост alpha (и beta, gamma при наличии)

Сгенерировать новую пару ed25519 у заказчика; публичный ключ добавить в /home/deploy/.ssh/authorized_keys на VM. Статус не выполнено.

Удалить с authorized_keys публичные ключи подрядчика (vdp_deploy_ed25519, vdp_ci_ed25519 и любые другие временные). Статус не выполнено.

Приватный ключ для GitHub Actions — без passphrase; хранится только в DEPLOY_SSH_KEY соответствующего Environment. Статус не выполнено.

Проверить вход: ssh deploy@DEPLOY_HOST с новым ключом заказчика; workflow VDP Deploy workflow_dispatch на alpha с последним успешным Images run. Статус не выполнено.

## Секреты приложения на VM

Файл /opt/vdp/.env.deploy: сгенерировать новые JWT_SECRET и HUB_SHARED_SECRET (openssl rand -hex 32); не копировать старые значения. Статус не выполнено.

ENVIRONMENT соответствует среде (alpha, beta или gamma). Переменные с суффиксом _BIND остаются 127.0.0.1; Caddy терминирует TLS. Статус не выполнено.

После смены секретов: docker compose pull и up по текущему .release-images.env; staging-smoke.sh green; login API отвечает не 502. Статус не выполнено.

Старые значения JWT_SECRET и HUB_SHARED_SECRET уничтожены (не в git, не в бэкапах чата). Статус не выполнено.

## DNS и облако

reg.ru: доступ к зоне vedy.io передан заказчику; A-запись alpha.vedy.io указывает на актуальный публичный IP VM. Статус не выполнено.

Selectel: проект и VM под учётной записью заказчика; подрядчик не root на prod-хосте. Статус не выполнено.

Документировать риск preemptible VM: возможна заморозка; runbook «после разморозки перезапустить compose stack» согласован с on-call. Статус не выполнено.

## GitLab mirror (вторичный форж)

Проект sandbox6902635/viletech-platform: токены и maintainer-доступ только у заказчика. Статус не выполнено.

Зеркалирование GitHub → GitLab работает; на GitLab нет deploy-секретов alpha, beta, gamma (см. gitlab-setup.md). Статус не выполнено.

## Финальная проверка после ротации

make release-gate или green vdp-release на теге vdp-v* перед pilot handover. Статус не выполнено.

security-signoff-checklist.md подписан; пункты про секреты и AuthZ закрыты. Статус не выполнено.

Заказчик получил краткую памятку: где Environments, как откатить digest, кого звать при 502 после freeze VM. Статус не выполнено.

Примечания / исключения с согласия заказчика:
