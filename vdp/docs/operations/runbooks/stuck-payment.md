# Runbook: зависший платёж / провайдер

## Симптомы

Заявка в payment_received или payment_processing дольше порога SLA.

Provider не видит заявку или не может payment/sent.

Semantic alert vdp_forms_stuck_awaiting_provider.

## Быстрая диагностика

Шаг 1. Найти form_payment_id в логах core по correlation id.

Шаг 2. Проверить статус: GET /api/v1/manager/form-payment/{id}

Шаг 3. Проверить назначение провайдера и client_agreed_provider.

Шаг 4. Provider view: GET /api/v1/provider/form-payment/{id}/active-order — без ПДн клиента.

## Типовые причины

Провайдер не принял в работу (payment/start не вызван).

Ошибка коннектора / таймаут (hub не на платежном commit, но уведомления могли не уйти).

Неверная роль или ACL.

## Действия

Шаг 1. Manager: повторить допустимый переход из матрицы (не обходить SM).

Шаг 2. При сбое hub — см. [hub-failure.md](hub-failure.md).

Шаг 3. Зафиксировать инцидент; postmortem при повторе.

## Эскалация

On-call eng + владелец payments context
