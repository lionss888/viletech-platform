# Secrets Rotation Runbook

Процедуры ротации критических секретов для production deployment.

## Scope

Поле JWT_SECRET (core). Назначение подписывание access и refresh tokens.

Поле HUB_SHARED_SECRET (core и hub S2S). Назначение взаимная аутентификация core и hub.

## Guards

Оба сервиса core и hub отказываются запускаться с dev-секретами вне local окружений. Проверка ValidateProduction в core pkg config и hub pkg config. Unit tests: TestValidateProduction в обоих модулях.

Local environments (dev-секреты допустимы): development, dev, local, test, ci.

Non-local environments (prod-секреты обязательны): production, staging, alpha, beta, gamma и любые другие значения ENVIRONMENT.

## JWT_SECRET Rotation

Перед ротацией: новый секрет минимум 32 символа, криптографически случайный; секрет в secret store; доступ к deployment config.

Процедура rolling (короткое окно невалидных токенов). Обновить JWT_SECRET в secret store. Выполнить rolling restart инстансов core. Старые access tokens станут невалидными; клиенты получат 401 и пойдут в refresh или повторный логин.

Влияние на клиентов. Короткоживущие access tokens обновляются через refresh. Долгоживущие refresh tokens могут потребовать повторного логина.

Проверка. Логи core без ошибки invalid production config. Успешный POST на api v1 auth login с возвратом token.

Откат. Вернуть JWT_SECRET к прежнему значению и rolling restart. Токены, выданные новым ключом, станут невалидными.

Рекомендации. Короткий TTL access token (1–2 часа). Sliding refresh. Будущее улучшение: массив допустимых JWT secrets для grace period без окна 401.

Текущая AuthService не поддерживает multiple JWT secrets из коробки; полный zero-downtime требует расширения ValidateToken.

## HUB_SHARED_SECRET Rotation (S2S)

Перед ротацией: новый S2S секрет минимум 32 символа в stores для core и hub; координация с ops.

Процедура. Обновить HUB_SHARED_SECRET в обоих stores. Restart hub первым. Дождаться health hub. Restart core. Во время окна S2S вызовы со старым секретом могут получать 403.

Влияние. Outbox flush core к hub ретраится. Callbacks hub к core могут временно падать с 403.

Проверка. Логи hub и core без ошибок shared secret. Успешный переход статуса заявки с доставкой события в hub.

Откат. Вернуть прежний HUB_SHARED_SECRET в обоих stores. Restart hub, затем core.

Будущее улучшение. Массив допустимых S2S секретов и grace period 24–48 часов, затем удаление старого.

## Best Practices

Частота: каждые 90 дней или при подозрении на компрометацию. Audit trail ротаций с timestamp и ответственным. Managed secret store, не plaintext в git. Алерты на spike 401 JWT или 403 S2S после ротации. Сначала staging, потом production.

## Emergency Rotation

При утечке: сгенерировать новый секрет, применить с приоритетом (допустим brief outage), инвалидировать старые токены или S2S, уведомить security и stakeholders, проверить логи на использование старого секрета.

## Related

См. [security-signoff-checklist.md](security-signoff-checklist.md) и [staging-checklist.md](staging-checklist.md).
