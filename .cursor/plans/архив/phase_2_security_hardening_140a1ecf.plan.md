---
name: Phase 2 Security Hardening
overview: "Критический блокер для production: AuthZ matrix audit, prod secrets rotation, file ACL enforcement, Provider DTO audit. Закрывает security-signoff-checklist.md для handover."
todos:
  - id: authz-audit
    content: "AuthZ matrix audit: все endpoints User/Manager/Provider/Treasurer/Root"
    status: completed
  - id: authz-tests
    content: "Unit/HTTP тесты AuthZ: 403 на чужую роль, не 500"
    status: completed
  - id: prod-secrets
    content: "Prod secrets: JWT_SECRET, HUB_SHARED_SECRET rotation + env guards"
    status: completed
  - id: file-acl-audit
    content: "File ACL audit: User только свои формы, чужой file_id → 403"
    status: completed
  - id: file-acl-tests
    content: "Unit/E2E file ACL: TestFileACLUserCannotPreviewForeignFormFile"
    status: completed
  - id: provider-dto-audit
    content: "Provider DTO audit: нет ПДн клиента (паспорт, личные контакты)"
    status: completed
  - id: hub-events-audit
    content: "Hub events audit: документы с ПДн не попадают в Provider events"
    status: completed
  - id: s2s-rotation-doc
    content: "S2S HUB_SHARED_SECRET: ротация задокументирована"
    status: completed
  - id: backup-encryption
    content: "Бэкапы БД и file store: encryption at rest checklist"
    status: completed
  - id: security-checklist
    content: "Закрыть security-signoff-checklist.md: все пункты выполнено"
    status: completed
isProject: false
---

# Phase 2: Security Hardening

## Цель и оценка

**Критический блокер** для production deployment импорт пилота.  
**Срок:** 3-4 рабочих дня (~25-30 часов)  
**Базис:** ~20 todos × 3.8 todo/ч + тестирование/валидация

## Scope

Закрытие всех пунктов [`vdp/docs/operations/security-signoff-checklist.md`](vdp/docs/operations/security-signoff-checklist.md) со статусом "не выполнено" → "выполнено".

## Работы по блокам

### 1. AuthZ Matrix Audit (8-10 часов)

**Задача:** Проверить все HTTP endpoints на корректную авторизацию ролей.

**Файлы для аудита:**
- [`vdp/core/internal/transport/http/nest_form_routes.go`](vdp/core/internal/transport/http/nest_form_routes.go)
- [`vdp/core/internal/transport/http/handlers.go`](vdp/core/internal/transport/http/handlers.go)  
- [`vdp/core/internal/service/*.go`](vdp/core/internal/service/) — все use cases

**Матрица ролей для проверки:**
```
User: только свои формы (org match)
Manager: все формы, все действия менеджера
Provider: только assigned формы, без ПДн клиента
Treasurer: import advance/postpay confirm, payment_received
ICO/ECO: organization_waiting_verification
Root: bypass для dev/admin
```

**Действия:**
1. Grep всех `handleNest*` и `handle*` в http/
2. Найти все `authz.AuthorizeRoles` и `authz.CanAccessForm`
3. Проверить отсутствие путей без AuthZ check перед use case
4. Убедиться: 403 на чужую роль, не 500 из domain

**Tests:**
- Расширить [`vdp/core/internal/transport/http/authz_test.go`](vdp/core/internal/transport/http/authz_test.go)
- Negative cases: Manager пытается treasurer action → 403
- Provider пытается чужую форму → 403  
- User пытается чужую org форму → 403

### 2. Production Secrets (4-6 часов)

**Задача:** Убрать dev-defaults из prod, добавить rotation procedure.

**Guard в коде:**
- [`vdp/core/cmd/vdp-core/main.go`](vdp/core/cmd/vdp-core/main.go): проверка `ENVIRONMENT=production` + reject `vdp-core-dev-secret`
- [`vdp/hub/cmd/hub/main.go`](vdp/hub/cmd/hub/main.go): reject `vdp-s2s-dev-secret`

**Rotation docs:**
- Создать [`vdp/docs/operations/secrets-rotation-runbook.md`](vdp/docs/operations/secrets-rotation-runbook.md)
- Процедура: генерация нового JWT_SECRET, rolling update, old key grace period
- S2S rotation: hub restart coordination, zero-downtime strategy

**Validation:**
- Unit test: core/hub main отказывается стартовать с dev secrets + `ENVIRONMENT=production`
- Staging: smoke с prod-like secrets (rotated dummy keys)

### 3. File ACL Enforcement (6-8 часов)

**Задача:** User видит только свои формы; чужой file_id → 403.

**Текущее состояние:**
- Existing test: [`TestFileACLUserCannotPreviewForeignFormFile`](vdp/core/internal/transport/http/file_preview_test.go)
- Проверить все file preview/download endpoints

**Audit paths:**
- `GET /api/v1/forms/{id}/files/{fileId}/preview`
- `GET /api/v1/forms/{id}/files/{fileId}/download`  
- Hub document access через DOCS_URL proxy

**Действия:**
1. Verify ACL check перед file serve в handlers
2. Убедиться: `authz.CanAccessForm` + file ownership match  
3. Provider file access: только deal documents, не ПДн клиента
4. Расширить tests: Manager/Provider/User × foreign file scenarios

**E2E validation:**
- Playwright: User A не видит файлы User B формы
- Provider видит только assigned form files

### 4. Provider DTO Audit (4-5 часов)

**Задача:** Provider DTO не содержит ПДн клиента (паспорт, личные контакты).

**Файлы для аудита:**
- [`vdp/core/internal/domain/formpayment/projection.go`](vdp/core/internal/domain/formpayment/projection.go)
- Hub events: [`vdp/hub/internal/inbox/events.go`](vdp/hub/internal/inbox/events.go)
- Bridge/adapters к Provider кабинету

**Запрещённые поля для Provider:**
- `user_passport`, `user_personal_contacts`, `user_inn` (если физлицо)
- Поля org сверх базового `org_name` / `org_country`
- Личные комментарии User из corrections

**Разрешённые поля:**
- `form_id`, `status`, `currency`, `invoice_amount`
- Deal documents (инвойс, контракт агента)
- Payment proof requirements, ПП attachment
- Provider assigned date/time

**Actions:**
1. Grep `ProviderView` / `toProviderDTO` паттерны
2. Unit test: assert отсутствие ПДн полей в JSON
3. Hub events audit: Provider inbox не содержит ПДн события

### 5. Backup Encryption (ops-side, 2-3 часа coordination)

**Задача:** Зафиксировать encryption at rest для postgres + file store.

**Checklist:**
- Postgres backups: encrypted на уровне storage или pg_dump | gpg
- File store (Selectel/S3): bucket encryption enabled
- Ключи backup encryption не в git, в ops secret store

**Deliverable:**
- Обновить [`vdp/docs/operations/security-signoff-checklist.md`](vdp/docs/operations/security-signoff-checklist.md): статус "выполнено" + ссылка на ops runbook
- Ops-side coordination: подтверждение от инфра-ответственного

### 6. Security Sign-Off (1-2 часа)

**Финальная проверка:**
- Пройти весь [`security-signoff-checklist.md`](vdp/docs/operations/security-signoff-checklist.md)
- Каждый пункт: "не выполнено" → "выполнено" + evidence (test/doc/config)
- Подпись ответственного + дата

## DoD / Gate

1. Все 10 todos выше closed
2. `security-signoff-checklist.md`: 100% пунктов "выполнено"
3. Tests green: AuthZ matrix + file ACL + Provider DTO audit
4. Secrets rotation docs ready  
5. Prod env guards проверены unit tests

## Сверка с rules

- `безопасность-ролей-и-данных`: AuthZ на каждом сервисе, Provider без ПДн, least privilege
- `тесты-архитектуры`: unit AuthZ + file ACL перед E2E
- `правила-построения`: тесты к каждому security change
- `vdp-ci-local-gate`: `make ci-pr` green после security правок

## Связь с другими фазами

- **Блокирует Фазу 3**: staging smoke требует prod-like secrets
- **Блокирует Milestone 1**: prod go-live невозможен без security sign-off
- **Не зависит от Фазы 1**: docs honesty независима от security

## Риски

**High:** AuthZ audit может выявить пропущенные endpoints → immediate fix
**Medium:** Secrets rotation может потребовать координации с ops → parallel track
**Low:** File ACL уже частично реализован, риск доработки минимален