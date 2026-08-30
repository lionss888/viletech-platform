# Security sign-off checklist (prod / pilot handover)

Подпись ответственного: _________________ Дата: _________

## AuthZ и роли

- [ ] Матрица ролей ВЭД проверена на API (User / ICO / ECO / Manager / Provider / Root)
- [ ] UI-скрытие кнопок не считается авторизацией; отказ чужой роли → 403, не 500
- [ ] Provider DTO и preview не содержат ПДн клиента (паспорт, личные контакты)

## Секреты и конфигурация

- [ ] `ENVIRONMENT=production` + `JWT_SECRET` и `HUB_SHARED_SECRET` не dev-default (guard в core/hub main)
- [ ] Секреты провайдера/БД только в secret store, не в git/образе
- [ ] S2S hub: ротация `HUB_SHARED_SECRET` задокументирована

## Файлы и документы

- [ ] ACL preview: User видит только свои формы; чужой file_id → 403 (unit `TestFileACLUserCannotPreviewForeignFormFile`)
- [ ] Документы с ПДн не попадают в события hub для Provider
- [ ] Бэкапы БД и file store — шифрование at rest (ops)

## Интеграции

- [ ] Staging smoke `scripts/staging-smoke.sh` green с реальными DOCS_URL / MAIL_URL
- [ ] Bank webhook (если канал bank) — HTTPS + подпись

## Observability

- [ ] Correlation / form id в логах платежного пути
- [ ] Semantic alerts и runbooks согласованы с on-call

Примечания / исключения с согласия заказчика:
