# Semantic alerts (baseline)

Рекомендуемые бизнес-сигналы для staging и prod. Пороги настраиваются под SLA пилота.

## Перечень алертов

Alert vdp_forms_stuck_awaiting_provider. Условие статус payment_received или payment_processing держится дольше N минут без payment_sent. Действие runbook stuck-payment.

Alert vdp_forms_stuck_compliance. Условие статус organization_waiting_verification держится дольше N часов. Действие эскалация ICO.

Alert vdp_hub_inbox_failures. Условие hub inbox mark_failed rate выше threshold. Действие runbook hub-failure.

Alert vdp_docs_generate_failed. Условие POG status failed или всплеск hub docs 5xx. Действие проверить DOCS_URL и шаблоны ПА.

Alert vdp_bank_webhook_errors. Условие bank webhook delivery failures. Действие проверить URL и секрет организации.

## Correlation

Все алерты должны включать form_payment_id и correlation_id из structured logs.

## Пример Prometheus rules

См. vdp/ops/prometheus-rules.example.yml.

## Не алертить

Dev compose со stub DOCS и MAIL.

OCR side-path недоступен, это деградация на ручной ввод, а не блокер заявки.
