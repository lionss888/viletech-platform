# Наблюдаемость VDP

Baseline для pilot и staging. Полный prod stack Datadog или Grafana не развёрнут в репозитории; документ фиксирует поля логов и семантические сигналы для on-call.

## Correlation и идентификаторы

Structured JSON-логи в core и hub. В HTTP middleware и use case слоях прокидывается correlation id запроса. Для путей заявки в логах должны присутствовать form_payment_id и при наличии payment_id или document_id. Hub inbox и outbox события несут event_id и form_payment_id без ПДн клиента.

При разборе инцидента цепочка: UI или API запрос по correlation id, затем form_payment_id в core store и hub dispatcher. Provider connector логи не должны содержать ФИО и паспортные поля.

## Semantic alerts concept

Формы зависшие в payment_processing дольше N минут после назначения провайдера. Формы в awaiting provider assignment без mgr assign дольше N часов. Refund в payment_refund_processing без перехода в sent дольше SLA. Outbox flush failures или hub inbox poison после max retries.

Пример текстового запроса к логам без привязки к вендору: фильтр level error и поле form_payment_id present и status payment_processing и timestamp старше порога.

## Graceful degradation

При недоступности hub docs или mail URL пустой в dev compose, core status machine не меняется silently success. Adapter возвращает ошибку или stub с явным storage_key stub. UI показывает ожидаемый статус, не ложный completed.

## Не в MVP репозитория

Развёрнутые alerting rules, distributed tracing export в Jaeger или OTel collector, дашборды latency по сервису. Рекомендуется включить на staging per [staging-checklist.md](staging-checklist.md) перед prod go-live.

## Связь с release gate

make release-gate не проверяет observability stack. Pilot handover требует принятия known-gaps по operational monitoring. См. [readiness-and-limits.md](../pilot/readiness-and-limits.md).
