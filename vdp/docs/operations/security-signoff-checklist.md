# Security sign-off checklist (prod / pilot handover)

Подпись ответственного: _________________ Дата: _________

## AuthZ и роли

Матрица ролей ВЭД проверена на API (User / ICO / ECO / Manager / Provider / Root). Статус не выполнено.

UI-скрытие кнопок не считается авторизацией; отказ чужой роли → 403, не 500. Статус не выполнено.

Provider DTO и preview не содержат ПДн клиента (паспорт, личные контакты). Статус не выполнено.

## Секреты и конфигурация

ENVIRONMENT=production + JWT_SECRET и HUB_SHARED_SECRET не dev-default (guard в core/hub main). Статус не выполнено.

Секреты провайдера/БД только в secret store, не в git/образе. Статус не выполнено.

S2S hub: ротация HUB_SHARED_SECRET задокументирована. Статус не выполнено.

Перед передачей заказчику: handover-secrets-checklist.md закрыт (PAT, DEPLOY_SSH_KEY, JWT/HUB на VM, доступы Selectel/reg.ru/GitHub/GitLab). Статус не выполнено.

## Файлы и документы

ACL preview: User видит только свои формы; чужой file_id → 403 (unit TestFileACLUserCannotPreviewForeignFormFile). Статус не выполнено.

Документы с ПДн не попадают в события hub для Provider. Статус не выполнено.

Бэкапы БД и file store — шифрование at rest (ops). Статус не выполнено.

## Интеграции

Staging smoke scripts/staging-smoke.sh green с реальными DOCS_URL / MAIL_URL. Статус не выполнено.

Bank webhook (если канал bank) — HTTPS + подпись. Статус не выполнено.

## Observability

Correlation / form id в логах платежного пути. Статус не выполнено.

Semantic alerts и runbooks согласованы с on-call. Статус не выполнено.

Примечания / исключения с согласия заказчика:
