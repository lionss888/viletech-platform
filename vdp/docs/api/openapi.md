# OpenAPI и матрица endpoint

## Файл forms.yaml

Расположение vdp/shared/openapi/forms.yaml. OpenAPI 3.0.3 partial spec.

Stage A живой. В yaml есть схема Form и response schema на четыре критичных path: GET /api/v1/health, POST /api/v1/forms, GET /api/v1/forms/{id}, POST /api/v1/forms/{id}/actions/{action}. Также в файле остаются login, list, role form-payment put, ICO org approve, unblock requests.

Required поля Form согласованы с CoreForm на fe и domain Form в core: id, account_id, organization_id, status, direction, kind, created_at, updated_at.

## Schema validate helper

Пакет vdp/shared/openapi загружает forms.yaml и проверяет JSON document против именованной схемы components.schemas. Публичные точки Load, LoadForms, ValidateNamedSchema. Unit: валидный Form ok; без status ошибка. Зависимости jsonschema и yaml.

## Httptest contract assert

Тест vdp/core/internal/transport/http/contract_schema_test.go гоняет живой httptest стек smoke: ответ health против схемы Health; create, get by id и action recognize_complete против схемы Form. Критерий пользы Stage A: если из ответа create убрать required поле, go test http-пакета core краснеет.

## Ограничение полноты

forms.yaml не описывает все 331 in-scope маршрут Nest parity. Полная проверка в коде TestR12MatrixInScopeComplete в vdp/core/internal/transport/http/r12_verification_test.go.

Утверждение 331/331 done означает маршрут замаплен и проходит gate test. Не означает полный продуктовый паритет Nest и не заменяет prod OpenAPI portal.

## Form-payment parity R1

148/148 form-payment done TestR1FormPaymentParityGate. Отдельный gate от общей матрицы R12.

## Stage B и дальше

Golden fixture, Vitest чтение golden и codegen типов fe из схемы не входят в Stage A. Всё это Stage B и опциональный Step C. Pact CDC для внешних потребителей API тоже later, не done. См. api_contract lean master и rule тесты-архитектуры.

## Incremental expansion

Расширение forms.yaml идёт итерациями по группам: auth forms, role paths, bank, admin, refund.

Автоген index из endpoint matrix опциональный follow-up. Приоритет human-readable docs в api/overview.md и domain docs.

## Swagger UI

См. также hub to DOCS контракт: [docs-generate.md](docs-generate.md) (B.2 generated PDF payload).

Hosted Swagger UI out of scope MVP. Локально forms.yaml можно импортировать в Swagger Editor.
