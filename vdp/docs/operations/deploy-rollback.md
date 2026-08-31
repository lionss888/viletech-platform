# Rollback release deploy (Compose, digest pin)

Rollback = выкат **предыдущего digest** без пересборки и без SSH-патча контейнеров.

## Preconditions

- На хосте есть `.release-images.{staging|production}.last-good` — создаётся успешным deploy (`deploy-compose-release.sh`).
- Remote `.env.deploy` с секретами не откатывается (только образы приложения).

## GitHub Actions

1. Найти предыдущий pin в artifact `release-images-pin` (older run) **или** использовать сохранённый `.last-good` на VM.
2. `workflow_dispatch` → **VDP Deploy** → environment `staging` / `production` с pin от предыдущего images run (`images_run_id`).

## На VM (SSH)

```sh
cd /opt/vdp
cp .release-images.staging.last-good .release-images.env   # или production
set -a && source .release-images.env && source .env.deploy && set +a
docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod \
  pull hub core fe-prod
docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod \
  up -d --no-build --pull always --scale fe=0
./scripts/wait-release-health.sh
```

## Make (с локальной машины)

```sh
cd vdp
DEPLOY_HOST=staging.example.com DEPLOY_USER=deploy SSH_KEY_PATH=~/.ssh/vdp_deploy \
  make rollback-staging
```

Prod: `make rollback-prod` с production host secrets.

## Verify

- `curl -sf http://HOST:8080/api/v1/health`
- `curl -sf http://HOST:8081/api/v1/health`
- `curl -sf http://HOST:3000/login`
- Staging: `./scripts/staging-smoke.sh`

## Post-incident

Blameless постмортем per `devops-культура`: timeline, impact (заявки/платежи), action items. Не патчить prod вручную — зафиксировать digest в pin и повторить deploy.
