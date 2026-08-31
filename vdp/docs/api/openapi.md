# OpenAPI и матрица endpoint

## Файл forms.yaml

Расположение vdp/shared/openapi/forms.yaml. OpenAPI 3.0.3 partial spec.

Содержит health, login, forms list create, actions transition, role form-payment put template, ICO org approve, unblock requests.

## Ограничение полноты

forms.yaml не описывает все 331 in-scope маршрут Nest parity. Полная проверка в коде TestR12MatrixInScopeComplete в vdp/core/internal/transport/http/r12_verification_test.go.

Утверждение 331/331 done означает маршрут замаплен и проходит gate test. Не означает полный продуктовый паритет Nest и не заменяет prod OpenAPI portal.

## Form-payment parity R1

148/148 form-payment done TestR1FormPaymentParityGate. Отдельный gate от общей матрицы R12.

## Incremental expansion DOC4

Расширение forms.yaml идёт итерациями по группам: auth forms, role paths, bank, admin, refund.

Автоген index из endpoint matrix — опциональный follow-up. Приоритет human-readable docs в api/overview.md и domain docs.

## Consumer contracts

При появлении внешних потребителей API рекомендуется CDC pact-style tests. См. тесты-архитектура rule.

## Swagger UI

См. также hub→DOCS контракт: [docs-generate.md](docs-generate.md) (B.2 generated PDF payload).

Hosted Swagger UI out of scope MVP. Локально можно импортировать forms.yaml в Swagger Editor.
