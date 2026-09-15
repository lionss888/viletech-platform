---
name: Phase 5 Export Domain
overview: "Export domain/API/tests: direction export, PAY_FROM_EXPORT treasurer, AuthZ. UI вне scope. Срок 5-7 дней по ритму."
todos:
  - id: exp-machine
    content: State machine export + PAY_FROM_EXPORT treasurer transitions
    status: pending
  - id: exp-unit
    content: Unit RoleMayPerform / transitions export
    status: pending
  - id: exp-api
    content: Nest/API routes direction=export
    status: pending
  - id: exp-http
    content: HTTP tests export happy + AuthZ deny
    status: pending
  - id: exp-docs
    content: form-lifecycle + roles docs export section
    status: pending
  - id: exp-regress-imp
    content: Regress IMP1-3 после export changes
    status: pending
isProject: false
---

# Phase 5: Export Domain

## Цель и оценка

**Цель:** доменный паритет export money path с unit/HTTP (без browser).  
**Срок:** 5–7 рабочих дней (~35–45 ч).  
**Базис:** ~25 todos × 3.8 todo/ч + complexity.  
**После:** Milestone 1; не блокирует prod import.

## Факты в коде

Уже есть зачатки:

- `DirectionExport`, `PaymentMethodPayFromExport`, `StatusOverpaymentExport` в formpayment
- Treasurer guard для PAY_FROM_EXPORT в machine
- UI/E2E export ladder — **нет** (Phase 6)

Источник ТЗ: [`вводные`](вводные/) — export order templates; overpay-treasurer как отдельный пакет от импортного аддендума §10.

## Работы

### 1. State machine export (12–15 ч)

- Явные переходы export vs import overlays
- PAY_FROM_EXPORT: treasurer confirm → целевой статус (как в Nest semantics)
- Unit table-driven: допустимые/запрещённые переходы + чужая роль

### 2. API / Nest routes (8–10 ч)

- Endpoints create/patch direction=export
- Treasurer path без ломания import IMP1
- AuthZ: Manager/Treasurer/Provider матрица

### 3. HTTP tests (8–10 ч)

- Зеркало IMP-стиля: `export_*_test.go` happy + AuthZ deny
- compose-e2e API journey export (опционально в этом пакете или Phase 6)

### 4. Docs (3–4 ч)

- form-lifecycle: секция export
- roles-and-authz: treasurer export vs import
- §9 вводных галочки только после green tests

## Вне scope

FE кабинеты, Playwright, PDF export templates pixel, POSTPAY на export.

## DoD

1. Unit + HTTP export green
2. Import regress IMP1–3 green
3. Lifecycle/roles docs sync
4. Gate: `go test` + при касании compose — `ci-pr-fast` минимум

## Rules

`use-cases`, `безопасность-ролей-и-данных`, `тесты-архитектуры`, `честность-готовности`, `планирование-сверка-с-rules`.
