# Docker Compose

Файл vdp/docker-compose.yml. Default STORE_DRIVER postgres.

## Сервис postgres-core

Image postgres 16 alpine. Host port 5433 to container 5432. Migrations 001–014 mounted to initdb.

## Сервис postgres-hub

Host port 5434. Migrations 001_hub 002_hub.

## Сервис docs-service

Port 8090. PDF generate reference. Hub DOCS_URL.

## Сервис mail-gateway

Port 8091. POST /notify. MAIL_PROVIDER=local|smtp. Hub MAIL_URL. Empty MAIL_URL still stubs in hub.

## Сервис sms-gateway

Port 8092. POST /notify. SMS_PROVIDER=local|http. Hub SMS_URL. OTP and critical events only.

## Сервис hub

Build hub/Dockerfile. Port 8081. Env HUB_SHARED_SECRET, CORE_URL, DATABASE_URL hub db.

## Сервис core

Build core/Dockerfile. Port 8080. Env JWT_SECRET, HUB_URL, DATABASE_URL core db. Depends on postgres-core and hub.

## Сервис fe development

Build fe Dockerfile target development. Port 5173. VDP_API_PROXY_TARGET http://core:8080. Volume mount fe source and fe_node_modules.

## Сервис fe-prod profile prod

Target production. Port 3000. Activate docker compose --profile prod.

## Healthchecks

wget health endpoints for hub core fe. compose-up waits up to 60s for all healthy.

## Volumes

fe_node_modules named volume for node_modules in dev container. Host npm install and image rebuild do not refresh this volume. After branch updates or package.json changes, run make compose-fe-refresh (prompts for confirmation).

## Команды

make compose-up, make compose-down, make compose-ps, make compose-fe-refresh. Prod make compose-up-prod.

Подробнее env: [environment.md](environment.md).
