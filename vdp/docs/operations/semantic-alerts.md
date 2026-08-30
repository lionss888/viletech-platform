# Semantic alerts (baseline)

Рекомендуемые бизнес-сигналы для staging/prod. Пороги настраиваются под SLA пилота.

| Alert | Условие | Действие |
|-------|---------|----------|
| `vdp_forms_stuck_awaiting_provider` | status `payment_received` или `payment_processing` > N минут без `payment_sent` | Runbook stuck-payment |
| `vdp_forms_stuck_compliance` | `organization_waiting_verification` > N часов | Эскалация ICO |
| `vdp_hub_inbox_failures` | hub inbox mark_failed rate > threshold | Runbook hub-failure |
| `vdp_docs_generate_failed` | POG status failed или hub docs 5xx spike | Проверить DOCS_URL / шаблоны ПА |
| `vdp_bank_webhook_errors` | bank webhook delivery failures | Проверить URL/секрет организации |

## Correlation

Все алерты должны включать `form_payment_id` и `correlation_id` из structured logs.

## Пример Prometheus rules

См. `vdp/ops/prometheus-rules.example.yml`.

## Не алертить

- Dev compose со stub DOCS/MAIL
- OCR side-path недоступен (деградация на ручной ввод, не блокер заявки)
