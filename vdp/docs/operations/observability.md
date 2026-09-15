# Наблюдаемость VDP

Baseline для pilot и staging. Полный prod stack Datadog или Grafana не развёрнут в репозитории; документ фиксирует поля логов и семантические сигналы для on-call.

## Correlation и идентификаторы (Phase 4: VERIFIED)

Structured JSON-логи в core и hub с автоматической context-based correlation.

Core: logger.WithFormPaymentID и logger.WithRequestID обогащают context. logger.FromContext автоматически добавляет correlation fields во все log statements в контексте. Проверено pkg/logger/logger_test.go.

Hub: logger.WithEventID и logger.WithFormPaymentID (Phase 4 enhancement parity with core). Dispatcher обогащает context перед plugin execution. Проверено pkg/logger/logger_test.go и dispatcher tests.

Для путей заявки в логах присутствуют form_payment_id и при наличии payment_id или document_id. Hub inbox и outbox события несут event_id и form_payment_id без ПДн клиента. Adapters включают form_payment_id в запросы к external services (docs mail sms).

При разборе инцидента цепочка: UI или API запрос по request_id, затем form_payment_id в core logs, hub dispatcher logs, и external service logs. Provider connector логи не содержат ФИО и паспортные поля.

Полная документация correlation flow: [correlation-logging.md](correlation-logging.md).

## Semantic alerts concept

Формы зависшие в payment_processing дольше N минут после назначения провайдера. Формы в awaiting provider assignment без mgr assign дольше N часов. Refund в payment_refund_processing без перехода в sent дольше SLA. Outbox flush failures или hub inbox poison после max retries.

Пример текстового запроса к логам без привязки к вендору: фильтр level error и поле form_payment_id present и status payment_processing и timestamp старше порога.

## Graceful degradation

При недоступности hub docs или mail URL пустой в dev compose, core status machine не меняется silently success. Adapter возвращает ошибку или stub с явным storage_key stub. UI показывает ожидаемый статус, не ложный completed.

## Не в MVP репозитория

Развёрнутые alerting rules, distributed tracing export в Jaeger или OTel collector, дашборды latency по сервису. Рекомендуется включить на staging per [staging-checklist.md](staging-checklist.md) перед prod go-live.

## Связь с release gate

make release-gate не проверяет observability stack. Pilot handover требует принятия known-gaps по operational monitoring. См. [readiness-and-limits.md](../pilot/readiness-and-limits.md).
