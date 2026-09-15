# Security sign-off checklist (prod / pilot handover)

Подпись ответственного: _________________ Дата: _________

## Phase progress

Phase 2 Security Hardening closed (AuthZ, file ACL, Provider and hub PII, prod secret guards, rotation and backup runbooks). Phase 3 Staging Readiness closed for local live DOCS and MAIL smoke; alpha remote SSH rollback still ops-blocked until DEPLOY_SSH_KEY refresh. Milestone 1 import-pilot 2026-09-15: contractor software items on this page remain выполнено; customer signature line stays blank until the customer signs.

## AuthZ и роли

Матрица ролей ВЭД проверена на API (User / ICO / ECO / Manager / Provider / Root). Статус выполнено. Evidence Phase 2: authz_matrix_audit_test.go plus fixes in account.go, organization.go, docs.go.

UI-скрытие кнопок не считается авторизацией; отказ чужой роли даёт 403, не 500. Статус выполнено. Evidence Phase 2: authz_matrix_audit_test.go.

Provider DTO и preview не содержат ПДн клиента (паспорт, личные контакты). Статус выполнено. Evidence Phase 2: provider_pii_audit_test.go plus IsPIIDocKind filtering.

## Секреты и конфигурация

ENVIRONMENT=production плюс JWT_SECRET и HUB_SHARED_SECRET не dev-default (guard в core и hub main). Статус выполнено. Evidence Phase 2: config.ValidateProduction и config_test.go.

Секреты провайдера и БД только в secret store, не в git или образе. Статус выполнено. Templates only in .env.example.

S2S hub: ротация HUB_SHARED_SECRET задокументирована. Статус выполнено. См. secrets-rotation-runbook.md.

Перед передачей заказчику: handover-secrets-checklist.md закрыт (PAT, DEPLOY_SSH_KEY, JWT и HUB на VM, доступы Selectel или reg.ru или GitHub или GitLab). Статус не выполнено. Milestone 1 2026-09-15 processed the checklist as an import-pilot known-gap: ownership rotation stays with the customer. Workstation SSH к alpha denied publickey on 2026-09-15; ops must refresh DEPLOY_SSH_KEY before remote smoke and secret rotate on the VM. Import UAT traffic is allowed with this gap. Prod ownership transfer is not claimed.

## Файлы и документы

ACL preview: User видит только свои формы; чужой file_id даёт 403. Статус выполнено. Evidence Phase 2: file_acl_test.go.

Документы с ПДн не попадают в события hub для Provider. Статус выполнено. Evidence Phase 2: hub_events_pii_audit_test.go.

Бэкапы БД и file store — шифрование at rest (ops). Статус выполнено на уровне runbook. См. backup-encryption-runbook.md; фактическая верификация storage на стороне ops.

## Интеграции

Staging smoke scripts/staging-smoke.sh green с реальными DOCS_URL и MAIL_URL. Статус выполнено (Phase 3, 2026-09-15). Local compose: make staging-smoke с docs-service generate и mail-gateway notify. Alpha edge: core health и seed login OK; full on-host hub docs mail smoke после SSH key fix.

Bank webhook (если канал bank) — HTTPS плюс подпись. Статус не выполнено. Остаётся опциональным; BANK_WEBHOOK_URL пустой в smoke.

## Observability

Correlation и form id в логах платежного пути. Статус выполнено (Phase 4, 2026-09-15). Evidence: hub logger enhanced with context-based correlation matching core (WithEventID, WithFormPaymentID, FromContext). Dispatcher enriches context before plugin execution. Full correlation flow documented in correlation-logging.md. Tests: core/pkg/logger/logger_test.go, hub/pkg/logger/logger_test.go.

Semantic alerts и runbooks согласованы с on-call. Статус выполнено (Phase 4, 2026-09-15). Evidence: Prometheus alert rules defined in ops/prometheus-rules.example.yml covering stuck payments, hub failures, gateway health, and compliance backlog. Runbooks created for stuck-payment and hub-failure with dry-run verification. On-call guide established at on-call-guide.md. Deployment script ready at scripts/deploy-alerts-staging.sh. Awaiting ops infrastructure for live Prometheus deployment.

Примечания / исключения с согласия заказчика:

Milestone 1 import-pilot 2026-09-15. Bank webhook remains optional while BANK_WEBHOOK_URL is empty. Handover secrets rotation is a customer action. Formal customer signature on this page is still blank. Contractor software AuthZ, file ACL, Provider PII, prod secret guards, local staging smoke, and ops runbooks are the signed-off engineering evidence for import UAT.
