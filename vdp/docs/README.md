# Документация VDP

Здесь собрана вся документация по платформе VDP.

## Для разработчиков

Если вы хотите развернуть проект локально или разобраться в коде, начните с [быстрого старта](development/getting-started.md).

Как запустить тесты и что они проверяют: [development/testing.md](development/testing.md).

Команды Makefile: [development/makefile-reference.md](development/makefile-reference.md).

Архитектура системы: [architecture/overview.md](architecture/overview.md), [architecture/contexts-and-data.md](architecture/contexts-and-data.md), [architecture/app-vs-demo.md](architecture/app-vs-demo.md).

Бизнес-логика и роли: [domain/roles-and-authz.md](domain/roles-and-authz.md), [domain/form-lifecycle.md](domain/form-lifecycle.md), [domain/documents-and-uploads.md](domain/documents-and-uploads.md).

API и интеграции: [api/overview.md](api/overview.md), [api/openapi.md](api/openapi.md).

Деплой и настройка: [operations/docker-compose.md](operations/docker-compose.md), [operations/environment.md](operations/environment.md), [operations/staging-checklist.md](operations/staging-checklist.md).

## Для пилотного запуска

Если планируете пилот или UAT, сначала прочтите про ограничения: [pilot/readiness-and-limits.md](pilot/readiness-and-limits.md).

Как тестировать систему: [pilot/uat-scenarios.md](pilot/uat-scenarios.md).

Что пока не реализовано: [pilot/known-gaps.md](pilot/known-gaps.md).

## Для поддержки пользователей

Какие задачи решают разные роли: [product/role-cabinets.md](product/role-cabinets.md).

Что видят провайдеры платежей: [product/provider-data-boundary.md](product/provider-data-boundary.md).

## О формате документов

Правила оформления описаны в [conventions/format.md](conventions/format.md).
