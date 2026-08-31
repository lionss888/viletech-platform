# Rollback release deploy (Compose, digest pin)

Rollback = выкат **предыдущего digest** без пересборки и без SSH-патча контейнеров.

Среды: `alpha` (демо/разработка, авто-деплой из `main`), `beta` (пред-прод, вручную), `gamma` (прод, вручную + approval).

## Preconditions

- На хосте есть `.release-images.{alpha|beta|gamma}.last-good` — создаётся успешным deploy (`deploy-compose-release.sh`).
- Remote `.env.deploy` с секретами не откатывается (только образы приложения).

## GitHub Actions

1. Найти предыдущий pin в artifact `release-images-pin` (older run) **или** использовать сохранённый `.last-good` на VM.
2. `workflow_dispatch` → **VDP Deploy** → environment `alpha` / `beta` / `gamma`, поле `images_run_id` = id предыдущего успешного **VDP Images** run.

## На VM (SSH)

```sh
cd /opt/vdp
cp .release-images.alpha.last-good .release-images.env   # или beta / gamma
set -a && source .env.deploy && source .release-images.env && set +a
docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod \
  pull hub core fe-prod
docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod \
  up -d --no-build --scale fe=0
./scripts/wait-release-health.sh
```

## Make (с локальной машины)

```sh
cd vdp
DEPLOY_HOST=alpha.vedy.io DEPLOY_USER=deploy SSH_KEY_PATH=~/.ssh/vdp_deploy_ed25519 \
  make rollback-alpha
```

Прод: `make rollback-gamma` с gamma host secrets.

## Verify

Порты приложения на хосте слушают только loopback (`*_BIND=127.0.0.1` в `.env.deploy`), поэтому проверка — по SSH или через домен:

```sh
ssh deploy@HOST 'curl -sf http://127.0.0.1:8080/api/v1/health'
ssh deploy@HOST 'curl -sf http://127.0.0.1:8081/api/v1/health'
curl -sfI https://alpha.vedy.io/login
```

Не-прод: `./scripts/staging-smoke.sh` на хосте.

## Post-incident

Blameless постмортем per `devops-культура`: timeline, impact (заявки/платежи), action items. Не патчить prod вручную — зафиксировать digest в pin и повторить deploy.
