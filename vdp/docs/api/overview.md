# Обзор API

REST API vdp/core на порту 8080. Префикс /api/v1. Fe проксирует /api с JWT Authorization header.

## Health

GET /api/v1/health. Ответ 200 ok.

## Auth

POST /api/v1/auth/login. Body email password. Ответ JWT token.

## Forms CRUD и list

GET /api/v1/forms. ACL по роли.

POST /api/v1/forms. Create заявки.

GET /api/v1/forms/{id}. Карточка с проекцией статуса и allowed actions.

## Domain actions

POST /api/v1/forms/{id}/actions/{action}. Generic transition bridge для fe action ids.

## Nest-parity role paths

PUT /api/v1/{role}/form-payment/{id}/{path}. Role enum site manager provider eco ico treasurer. Parity с legacy Nest backend-for-ved.

## ICO admin org

PUT /api/v1/admin/internal-compliance-officer/organization/{id}/approve.

POST /api/v1/organizations/{id}/unblock-requests.

## Bank API R10

POST /api/v1/bank/forms. JWT bank role. Только организация bank client BankOrgID.

## Admin root

GET PATCH /api/v1/admin/account*. Root superadmin RD8.

## AuthZ

Каждый endpoint проверяет роль и объект form id. 403 Forbidden при чужой роли. 409 при недопустимом transition.

## Action bridge fe

Fe action ids в actions.ts мапятся на core endpoints через platform-store bridge. Unit tests action-bridge.test integration-journey.test.

## Idempotency

Повтор payment confirm и provider sent должен быть безопасен. At-least-once hub callback with idempotent handler in core.

## Correlation

Логи и bank channel используют correlation id заявки сквозь gateway to core to hub.

Подробнее openapi stub: [openapi.md](openapi.md).

Примеры curl: [../development/getting-started.md](../development/getting-started.md).
