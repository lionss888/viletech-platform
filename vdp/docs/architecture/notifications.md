# Уведомления и шина провайдеров

Core решает когда и кому слать. Hub доставляет. Gateway выбирает провайдера. Статус заявки не меняется в gateway.

## Каталог

Событие ведёт на каналы telegram, mail, sms и шаблон. SMS только OTP и критичные события (блок организации, отказ или отмена CO). Полный список — пакет shared/notify.

## Контракт gateway

POST /notify JSON: event_id, form_payment_id, channel, to, template, idempotency_key. Ответ accepted или duplicate. GET /health.

Повтор с тем же ключом — один эффект. Логи маскируют адрес to. В payload нет ПДн (паспорт, ФИО, ИНН).

## Подписки

Источник истины — core: accounts.telegram_chat_id, флаги telegram и sms, рабочие чаты и join-запросы. UI только проекция.

## Процессы

mail-gateway и sms-gateway — отдельные контейнеры (как docs-service). Hub ходит на MAIL_URL и SMS_URL. Общей БД с core нет.
