# Обзор архитектуры

VDP состоит из трёх исполняемых контекстов: core, hub и fe. Каждый контекст имеет свой процесс, контракт наружу и отдельное хранилище данных в production-like compose.

## Core

Назначение. Домен заявки form-payment, статусная машина, authz по ролям, REST API для кабинетов и bank API.

Порт по умолчанию. 8080.

База данных. postgres-core, схема vdp_core.

## Hub

Назначение. Адаптеры внешних систем: документы, почта, OCR, Diadoc, уведомления. Callback в core по завершении асинхронных задач.

Порт по умолчанию. 8081.

База данных. postgres-hub, схема vdp_hub.

## Frontend

Назначение. UI кабинетов ролей. App-контур: JWT и прокси /api на core. Demo-контур: локальные моки /demo/*.

Порт dev. 5173.

Порт prod profile. 3000.

## Compose-стек

Сервисы postgres-core, postgres-hub, hub, core, fe поднимаются через docker-compose.yml в корне vdp. STORE_DRIVER=postgres по умолчанию. Memory driver только для unit-тестов.

## Поток запроса от UI

Браузер отправляет команду в fe. Fe проксирует REST на core с JWT.

Core проверяет authz и выполняет переход статуса или команду use case.

При необходимости асинхронной работы core записывает задачу в outbox.

Hub забирает задачу, вызывает внешний адаптер или stub.

Hub отправляет callback в core. Core обновляет проекцию заявки и публикует событие для UI.

UI читает актуальный статус через GET /forms/{id}. UI не хранит канонический статус.

## Связанные документы

Границы данных и outbox: [contexts-and-data.md](contexts-and-data.md).

App vs demo: [app-vs-demo.md](app-vs-demo.md).

Операции compose: [../operations/docker-compose.md](../operations/docker-compose.md).
