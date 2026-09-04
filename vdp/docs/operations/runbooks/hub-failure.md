# Runbook: сбой VDP Hub

## Симптомы

Outbox core растёт, события docs.generate / mail.notify / sms.notify не доставляются.

Hub /api/v1/health не 200.

Inbox failures в логах hub.

## Быстрая диагностика

Шаг 1. Команда: curl $HUB_URL/api/v1/health

Шаг 2. Логи hub: plugin name, form_payment_id, HTTP status внешних URL.

Шаг 3. Проверить DOCS_URL, MAIL_URL, SMS_URL через scripts/staging-smoke.sh. Для compose: curl mail-gateway:8091/health и sms-gateway:8092/health.

## Деградация (ожидаемое поведение)

Заявка остаётся в допустимом статусе; повтор outbox идемпотентен.

Docs dev stub: docs/{id}/stub.pdf только без DOCS_URL — не считать prod success.

Mail stub: accepted без реальной отправки, если MAIL_URL пуст. Compose local provider пишет лог, не SMTP.

SMS stub: accepted без SMSC, если SMS_URL пуст. Gateway не меняет статус заявки.

## Восстановление

Шаг 1. Поднять hub / исправить сеть.

Шаг 2. Core outbox flush повторит pending (at-least-once + идемпотентность handlers).

Шаг 3. После восстановления DOCS_URL — перегенерация POG по политике manager.

## Профилактика

Circuit breaker / лимит ретраев на внешние адаптеры.

Мониторинг vdp_hub_inbox_failures.
