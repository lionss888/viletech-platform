# Runbook: сбой VDP Hub

## Симптомы

- Outbox core растёт, события `docs.generate` / `mail.notify` не доставляются
- Hub `/api/v1/health` не 200
- Inbox failures в логах hub

## Быстрая диагностика

1. `curl $HUB_URL/api/v1/health`
2. Логи hub: plugin name, `form_payment_id`, HTTP status внешних URL
3. Проверить `DOCS_URL`, `MAIL_URL` через `scripts/staging-smoke.sh`

## Деградация (ожидаемое поведение)

- Заявка остаётся в **допустимом** статусе; повтор outbox идемпотентен
- Docs dev stub: `docs/{id}/stub.pdf` только без `DOCS_URL` — не считать prod success
- Mail stub: accepted без реальной отправки

## Восстановление

1. Поднять hub / исправить сеть
2. Core outbox flush повторит pending (at-least-once + идемпотентность handlers)
3. После восстановления DOCS_URL — перегенерация POG по политике manager

## Профилактика

- Circuit breaker / лимит ретраев на внешние адаптеры
- Мониторинг `vdp_hub_inbox_failures`
