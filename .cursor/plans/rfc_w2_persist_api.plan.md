---
name: RFC W2 Persist API
overview: "Persist mandatory + pilot compliance seed; HTTP PUT/GET; каталог capabilities с title/description для UI."
todos:
  - id: w2-migration-017
    content: "017: column mandatory, backfill, ICO/ECO off, DELETE root, bump version"
    status: pending
  - id: w2-store
    content: "Postgres + memory store read/write mandatory"
    status: pending
  - id: w2-service-http
    content: "UpdateRole accepts mandatory; GET from config; filter admin roles"
    status: pending
  - id: w2-cap-catalog
    content: "GET process-roles: capabilities_catalog id+title+description (RU)"
    status: pending
  - id: w2-tests
    content: "Service/HTTP tests mandatory toggle + root absent + catalog present"
    status: pending
isProject: false
---

# RFC W2 — Persist + HTTP + catalog labels

**Мастер:** [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md)  
**Зависимости:** W1  
**Следующая:** W3

## Цель

Доставить mandatory в БД/API и единый человекопонятный каталог прав для FE (W4/W5).

## Сверка с `.cursor/rules`

Наследует матрицу мастера. Срез волны:

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `правила-построения`, `честность-готовности`, `границы-и-контексты`, `интеграция-и-события`, `безопасность-ролей-и-данных` (AuthZ `process_roles.manage` на PUT), `развертывание-и-доставка` (миграция expand, без секретов в git), `устойчивость-и-наблюдаемость` (ошибки валидации без ПДн), `тесты-архитектуры`, `go-architecture`, `go-testing`, `go-resilience-security`, `лучшие-практики` (версионируемый контракт catalog).

**Вне scope волны:** FE rendering (W4); journey bypass (W3); `nestjs-*`; ML; serverless; docs без запроса; `vdp-fe-docker-пересборка`; BPM.

**Gate/DoD-чеки:** migration clean+existing; GET без root; PUT mandatory; disable+mandatory→400; catalog title/description на каждый business cap; service/HTTP tests; AuthZ не «просто строка root».


## Шаги

### Миграция `017_role_mandatory_and_pilot_compliance.sql`

- `ALTER TABLE role_process_configs ADD COLUMN IF NOT EXISTS mandatory BOOLEAN NOT NULL DEFAULT FALSE`
- Backfill: роли из бывшего StageBinding mandatory → true (user, ico, eco, manager, provider, senior_provider); затем **override** ICO/ECO → `mandatory=false`, `enabled=false`
- `DELETE FROM role_process_configs WHERE role = 'root'`
- Bump `process_policy_meta.version`

### Store

- [`store_process_roles.go`](vdp/core/internal/repository/postgres/store_process_roles.go) + memory: SELECT/INSERT/UPDATE включают `mandatory`

### Service / HTTP

- [`process_roles.go`](vdp/core/internal/service/process_roles.go): `RoleConfigUpdate.Mandatory *bool`; `mandatory_roles` из config; filter `IsProcessEligibleRole`
- [`process_roles_routes.go`](vdp/core/internal/transport/http/process_roles_routes.go): JSON `mandatory` из config

### Каталог подписей (RU)

В GET `/api/v1/process-roles` добавить рядом с `capabilities[]`:

```json
"capabilities_catalog": [
  {"id": "form.view", "title": "Просмотр заявки", "description": "Видеть карточку и статус заявки без смены статуса."},
  ...
]
```

Источник: код (map рядом с [`capabilities.go`](vdp/core/internal/domain/formpayment/capabilities.go) или `capability_labels.go`) — один контракт для process-roles и admin form. System caps — отдельный короткий catalog если уже отдаются.

Минимум подписей на все `AllCapabilities()`; machine id остаётся в API для PATCH.

## DoD W2

- [ ] Migration применяется на clean + existing DB
- [ ] GET без root; PUT mandatory работает; disable+mandatory=true → 400
- [ ] Catalog с title/description на каждый business cap
- [ ] Service/HTTP tests green
