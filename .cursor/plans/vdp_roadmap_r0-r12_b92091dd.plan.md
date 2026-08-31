---
name: VDP roadmap R0-R12
overview: Программа доведения vdp до проверяемого соответствия Nest backend-for-ved + вводные ВИ + расширение вводных. Несколько независимых планов R0–R12; правило честности готовности; критерии закрытия без ложного «100%».
todos:
  - id: create-r0
    content: Создать plan-файл R0 Gate + honesty rule
    status: pending
  - id: create-r1
    content: Создать plan-файл R1 FormPayment SM+API
    status: pending
  - id: create-r2
    content: Создать plan-файл R2 Auth Account Org
    status: pending
  - id: create-r3
    content: Создать plan-файл R3 Contracts+ПА
    status: pending
  - id: create-r4
    content: Создать plan-файл R4 Docs domain
    status: pending
  - id: create-r5
    content: Создать plan-файл R5 Multi-order
    status: pending
  - id: create-r6
    content: Создать plan-файл R6 Rate/POG/Template
    status: pending
  - id: create-r7
    content: Создать plan-файл R7 Refund
    status: pending
  - id: create-r8
    content: Создать plan-файл R8 Hub real
    status: pending
  - id: create-r9
    content: Создать plan-файл R9 Extended Nest
    status: pending
  - id: create-r10
    content: Создать plan-файл R10 Bank API
    status: pending
  - id: create-r11
    content: Создать plan-файл R11 Gap residual
    status: pending
  - id: create-r12
    content: Создать plan-файл R12 Verification
    status: pending
isProject: false
---

# Программа vdp: дорожная карта R0–R12

## Источники истины (приоритет)

1. [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt) — базовый флоу, роли, поля документов.
2. [`вводные/расширение вводных.txt`](вводные/расширение%20вводных.txt) — договоры/ПА, multi-order, refund, Bank API.
3. Nest [`backend-for-ved`](кастомные%20модули%20для%20адаптации%20и%20переиспользования/backend-for-ved) — эталон **поведения** API/статусов.
4. [`заметки/gap-analysis-backend.md`](заметки/gap-analysis-backend.md) — Must/Should.

При конфликте расширения с ВИ — **побеждает ВИ**, пока нет явного согласования (§ расширение).

## Правила проекта (обязательны во всех R*)

Опираться на `.cursor/rules`:
- `границы-и-контексты` — core vs hub, отдельные БД
- `интеграция-и-события` — REST + outbox; статусы только в core SM; идемпотентность
- `безопасность-ролей-и-данных` — AuthZ на каждом сервисе; Provider без ПДн
- `устойчивость-и-наблюдаемость` — корреляция по id заявки; деградация без смены статуса
- `go-architecture` / `go-testing` / `правила-построения` — тесты + самопроверка переходов/ролей
- `лучшие-практики` — `/api/v1`, JWT, без admin/test smoke
- Документацию README/ARCHITECTURE не плодить без запроса

**Правило честности (создать в R0):** нельзя `completed` / «100%» / «паритет», если не выполнен проверяемый DoD плана; каркас/stub = частично + явный %.

## Зафиксированные решения (открытые из расширения)

- Плоские статусы Nest (не stage/substage в MVP).
- `REPORT_ACCEPTED` сохраняем (как в Nest).
- Добавление пользователя в орг.: Manager + Root.
- Логистика (§8 расширения) — вне программы.
- `REPORTER` — не переносить.
- `analytics` / `assistant` / `fe` — только скелет, вне R1–R12 реализации.

## Текущая база

[`vdp/core`](vdp/core) + [`vdp/hub`](vdp/hub) — каркас (~6k LOC), **не** паритет. Default часто memory; hub adapters — stubs.

## Серия планов (исполнять по одному)

```mermaid
flowchart LR
  R0[R0 Gate Honesty] --> R1[R1 FormPayment SM]
  R1 --> R2[R2 Auth Org]
  R2 --> R3[R3 Contracts PA]
  R3 --> R4[R4 Docs File]
  R4 --> R5[R5 Multi Order]
  R5 --> R6[R6 Rate Docs Gen]
  R6 --> R7[R7 Refund]
  R7 --> R8[R8 Hub Real]
  R8 --> R9[R9 Extended Nest]
  R9 --> R10[R10 Bank API]
  R10 --> R11[R11 Gap Residual]
  R11 --> R12[R12 Verification]
```

| ID | Имя плана | DoD (кратко) |
|----|-----------|--------------|
| R0 | Gate + honesty rule + Nest route inventory | Rule в `.cursor/rules`; матрица Nest↔vdp↔ВИ↔расширение в коде/тестах; Postgres path в compose |
| R1 | FormPayment SM + role APIs | ≥95% Nest form-payment HTTP actions mapped; table-driven все transitionsImport/Export/rate-on-pp |
| R2 | Auth Account Org | Nest auth/org controllers behavior; client statuses ВИ; ICO approve/block |
| R3 | Contracts + ПА (§1–2 расширения) | 3 типа договоров; templates per agent; manual attach+auto-confirm; on-behalf org |
| R4 | Contract/Counterparty/Comment/File/Compliance | CRUD + привязка к form; storage interface |
| R5 | Multi-order ADVANCE (§3) | N поручений на заявку; active order for provider |
| R6 | Rate Commission POG Template | Расчёт + async docs.generate; Excel import CREATING→DRAFT |
| R7 | Refund (§4) | REFUND_* + инвариант не CANCELED при невозвращённых ДС |
| R8 | Hub real adapters | TG/Diadoc/OCR/1C/Partner не stub-only в контрактных тестах; callback→core only |
| R9 | Liquidity VA Treasurer Socket Mail Agent HsCode | Nest as-is modules в vdp |
| R10 | Bank API (§5) | client type Bank; idempotent create; webhooks; no PII to provider |
| R11 | Gap Must/Should residual | Все ID Must/Should из gap = `есть` |
| R12 | Verification | compose E2E User→…→Provider; матрица без дыр; самопроверка правил |

Каждый R* — **отдельный** plan-файл с полным DoD; закрывать только после gate, не пачкой.

## Вне программы

П.3 inventory прочих AMG-модулей; полный фронт; BDUI; иностр. PSP; логистика.