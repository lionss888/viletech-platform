# Документация VDP

Этот каталог — единая точка product documentation для vdp. Формат: только заголовки h1–h3 и абзацы p. Правило описано в [conventions/format.md](conventions/format.md).

## Аудитория Dev

Разработчикам и инженерам, которые поднимают стек, пишут код и прогоняют gate-тесты.

Точка входа: [development/getting-started.md](development/getting-started.md).

Тесты и parity: [development/testing.md](development/testing.md).

Makefile: [development/makefile-reference.md](development/makefile-reference.md).

Архитектура: [architecture/overview.md](architecture/overview.md), [architecture/contexts-and-data.md](architecture/contexts-and-data.md), [architecture/app-vs-demo.md](architecture/app-vs-demo.md).

Домен: [domain/roles-and-authz.md](domain/roles-and-authz.md), [domain/form-lifecycle.md](domain/form-lifecycle.md), [domain/documents-and-uploads.md](domain/documents-and-uploads.md).

API: [api/overview.md](api/overview.md), [api/openapi.md](api/openapi.md).

Операции: [operations/docker-compose.md](operations/docker-compose.md), [operations/environment.md](operations/environment.md), [operations/staging-checklist.md](operations/staging-checklist.md).

## Аудитория Pilot

Заказчику и команде UAT для пилотной передачи с явными ограничениями MVP.

Готовность и ограничения: [pilot/readiness-and-limits.md](pilot/readiness-and-limits.md).

Сценарии UAT: [pilot/uat-scenarios.md](pilot/uat-scenarios.md).

Известные пробелы: [pilot/known-gaps.md](pilot/known-gaps.md).

## Аудитория Support

Поддержке и продукту для self-service help в кабинетах.

Кабинеты и top tasks: [product/role-cabinets.md](product/role-cabinets.md).

Глоссарий UI по ролям: [product/copy-glossary.md](product/copy-glossary.md).

Граница данных Provider: [product/provider-data-boundary.md](product/provider-data-boundary.md).
