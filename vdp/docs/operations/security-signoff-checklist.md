# Security sign-off checklist (prod / pilot handover)

Подпись ответственного: _________________ Дата: _________

## Phase progress

Phase 2 Security Hardening closed (AuthZ, file ACL, Provider and hub PII, prod secret guards, rotation and backup runbooks). Phase 3 Staging Readiness closed for local live DOCS and MAIL smoke; alpha remote SSH rollback still ops-blocked until DEPLOY_SSH_KEY refresh.

## AuthZ и роли

Матрица ролей ВЭД проверена на API (User / ICO / ECO / Manager / Provider / Root). Статус выполнено. Evidence Phase 2: authz_matrix_audit_test.go plus fixes in account.go, organization.go, docs.go.

UI-скрытие кнопок не считается авторизацией; отказ чужой роли даёт 403, не 500. Статус выполнено. Evidence Phase 2: authz_matrix_audit_test.go.

Provider DTO и preview не содержат ПДн клиента (паспорт, личные контакты). Статус выполнено. Evidence Phase 2: provider_pii_audit_test.go plus IsPIIDocKind filtering.

## Секреты и конфигурация

ENVIRONMENT=production плюс JWT_SECRET и HUB_SHARED_SECRET не dev-default (guard в core и hub main). Статус выполнено. Evidence Phase 2: config.ValidateProduction и config_test.go.

Секреты провайдера и БД только в secret store, не в git или образе. Статус выполнено. Templates only in .env.example.

S2S hub: ротация HUB_SHARED_SECRET задокументирована. Статус выполнено. См. secrets-rotation-runbook.md.

Перед передачей заказчику: handover-secrets-checklist.md закрыт (PAT, DEPLOY_SSH_KEY, JWT и HUB на VM, доступы Selectel или reg.ru или GitHub или GitLab). Статус не выполнено. Блокер: workstation SSH к alpha denied publickey на 2026-09-15 — обновить DEPLOY_SSH_KEY до M1.

## Файлы и документы

ACL preview: User видит только свои формы; чужой file_id даёт 403. Статус выполнено. Evidence Phase 2: file_acl_test.go.

Документы с ПДн не попадают в события hub для Provider. Статус выполнено. Evidence Phase 2: hub_events_pii_audit_test.go.

Бэкапы БД и file store — шифрование at rest (ops). Статус выполнено на уровне runbook. См. backup-encryption-runbook.md; фактическая верификация storage на стороне ops.

## Интеграции

Staging smoke scripts/staging-smoke.sh green с реальными DOCS_URL и MAIL_URL. Статус выполнено (Phase 3, 2026-09-15). Local compose: make staging-smoke с docs-service generate и mail-gateway notify. Alpha edge: core health и seed login OK; full on-host hub docs mail smoke после SSH key fix.

Bank webhook (если канал bank) — HTTPS плюс подпись. Статус не выполнено. Остаётся опциональным; BANK_WEBHOOK_URL пустой в smoke.

## Observability

Correlation и form id в логах платежного пути. Статус не выполнено. Закрывается в Phase 4.

Semantic alerts и runbooks согласованы с on-call. Статус не выполнено. Закрывается в Phase 4.

Примечания / исключения с согласия заказчика:
