# Переменные окружения

Core config vdp/core/pkg/config/config.go. Hub использует PORT STORE_DRIVER DATABASE_URL HUB_SHARED_SECRET CORE_URL.

## PORT core

Default 8080. HTTP listen port core API.

## PORT hub

Default 8081. HTTP listen hub API.

## HOST

Default 0.0.0.0.

## LOG_LEVEL

Default info. Structured JSON logs recommended prod.

## ENVIRONMENT

Default development. Prod set explicit staging or production.

## DATABASE_URL core

Default postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable. Prod use secret store and TLS sslmode require.

## DATABASE_URL hub

Default postgres://vdp_hub:vdp_hub@localhost:5432/vdp_hub?sslmode=disable. Separate database mandatory.

## STORE_DRIVER

Default postgres. Memory only unit tests never prod compose.

## JWT_SECRET

Default vdp-core-dev-secret. Prod rotate strong secret never commit git.

## JWT_EXPIRATION_HOURS

Default 24.

## HUB_URL

Default http://localhost:8081. Core calls hub S2S.

## HUB_SHARED_SECRET

Default vdp-s2s-dev-secret. Prod rotate match hub and core.

## GATEWAY_RATE_LIMIT

Default 120 per minute.

## GATEWAY_TIMEOUT

Default 15 seconds.

## MAIL_URL hub

Compose: http://mail-gateway:8091/notify. Empty → hub stub. Gateway provider via MAIL_PROVIDER.

## SMS_URL hub

Compose: http://sms-gateway:8092/notify. Empty → hub stub.

## TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME

Optional. Empty token → telegram fixture. Username used for personal deep-link.

## ONEC_URL / DIADOC_URL

Optional vendor URLs. Empty → fixture. Gateway must not change form status.

## VDP_API_PROXY_TARGET fe

Default http://core:8080 in compose. Local dev http://localhost:8080.

## Makefile exports dev defaults

DATABASE_URL_CORE, DATABASE_URL_HUB, STORE_DRIVER, HUB_URL, CORE_URL, HUB_SHARED_SECRET, JWT_SECRET exported in Makefile for local run targets.

## Prod recommendations

Never use dev secrets in prod. Separate KMS for JWT and HUB_SHARED_SECRET. Network segmentation hub connectors. No PII in log labels.
