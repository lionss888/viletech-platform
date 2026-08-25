---
name: R4 Docs Domain
overview: RESET ready for re-run. Counterparty, Comment, File, ComplianceHistory + связка с form/contract по Nest.
todos:
  - id: r4-counterparty
    content: Counterparty Nest API
    status: completed
  - id: r4-comment-file
    content: Comment + File store APIs
    status: completed
  - id: r4-compliance
    content: ComplianceHistory list/API
    status: completed
  - id: r4-tests
    content: RBAC + attach tests
    status: completed
isProject: false
---

# R4: Docs domain modules

## Цель

Nest-паритет modules: counterparty, comment, file, compliance-history; связь с form и contract из R3.

## Якоря

Nest `counterparty`, `comment`, `file`, `compliance-history` web controllers.

## Правила

Минимум данных на границе; файлы не в логах; тесты CRUD + RBAC zones.

## Работы

1. Counterparty CRUD + bank accounts + link to form-payment.
2. Comment site/manager/provider + mark-as-read.
3. File upload/preview по ролям (site/admin/provider/1c); storage interface (S3 stub OK, контракт стабилен).
4. ComplianceHistory append на transitions (уже частично) + list API.
5. Привязка файлов договора/поручения к form docs JSON.

## DoD

Nest routes этих модулей = done в matrix. Unit + smoke upload→attach→history.

## Вне scope

PDF field mapping (ВИ детальный маппинг — позже); Diadoc real (R8).
