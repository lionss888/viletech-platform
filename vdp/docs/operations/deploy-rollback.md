# Rollback release deploy (Compose, digest pin)

Rollback это выкат предыдущего digest без пересборки и без SSH-патча контейнеров. Человеческая памятка кнопки: [how-to-update.md](how-to-update.md).

Среда alpha. Назначение демо и разработка. Режим авто-деплой из ветки main после зелёного Images.

Среда beta. Назначение пред-прод. Режим вручную или окно расписания.

Среда gamma. Назначение прод. Режим вручную с approval. На прод попадает только обновление с тегом vdp-v, уже собранное.

Среда demo. Именованный слот заказчика. Режим вручную.

Среда test. Слот test и PR-preview на одной VM.

## Preconditions

На хосте есть pin-файл последнего успешного релиза для нужной среды: .release-images.alpha.last-good и аналоги для beta, gamma, demo, test. Такой файл создаётся успешным deploy через deploy-compose-release.sh.

Remote-файл .env.deploy с секретами не откатывается, откатываются только образы приложения.

## GitHub Actions

Шаг первый. Найти предыдущий pin в GitHub Release или в artifact release-images-pin у более раннего run.

Шаг второй. Запустить workflow_dispatch, workflow VDP Deploy, environment alpha или beta или gamma или demo или test, поле images_run_id равно id предыдущего успешного run workflow VDP Images.

## На VM (SSH)

Перейти в каталог развёртывания: cd /opt/vdp.

Скопировать pin последнего хорошего релиза в активный файл: cp .release-images.alpha.last-good .release-images.env. Для других сред подставляется beta, gamma, demo или test.

Загрузить переменные окружения: set -a && source .env.deploy && source .release-images.env && set +a.

Подтянуть образы: docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod pull hub core fe-prod.

Накатить SQL на существующие volumes: `COMPOSE_FILES="-f docker-compose.yml -f docker-compose.release.yml" ./scripts/compose-db-migrate.sh` (или через `./scripts/vdp-compose-up.sh`, который делает migrate сам).

Поднять сервисы: docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod up -d --no-build --scale fe=0; затем restart core hub после migrate.

Дождаться health: ./scripts/wait-release-health.sh.

## Make (с локальной машины)

Перейти в каталог vdp: cd vdp.

Запустить откат alpha с переменными DEPLOY_HOST равным alpha.vedy.io, DEPLOY_USER равным deploy и SSH_KEY_PATH равным путь к ключу, команда make rollback-alpha.

Аналогично для пред-прода используется make rollback-beta.

Прод откатывается командой make rollback-gamma с gamma host secrets.

## Verify

Порты приложения на хосте слушают только loopback, потому что переменные с суффиксом BIND в файле .env.deploy заданы в 127.0.0.1. Поэтому проверка выполняется по SSH или через публичный домен.

Проверка core по SSH: ssh deploy@HOST curl -sf http://127.0.0.1:8080/api/v1/health.

Проверка hub по SSH: ssh deploy@HOST curl -sf http://127.0.0.1:8081/api/v1/health.

Проверка через домен: curl -sfI https://alpha.vedy.io/login.

Не-прод дополнительно проверяется скриптом ./scripts/staging-smoke.sh на хосте.

Preemptible VM: после разморозки compose up по текущему pin, без пересборки.

## Post-incident

Blameless постмортем согласно правилу devops-культура: timeline, impact по заявкам и платежам, action items. Не патчить prod вручную, вместо этого зафиксировать digest в pin и повторить deploy.
