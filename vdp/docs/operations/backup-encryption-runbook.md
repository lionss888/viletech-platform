# Backup Encryption Runbook

Шифрование at rest для бэкапов БД и file store VDP. ПДн и платёжные данные в бэкапах не хранятся в открытом виде.

## Scope

В scope: PostgreSQL backups (form_payment, accounts, organizations); file store backups (документы, отчёты, identity); ключи шифрования бэкапов и контроль доступа.

Вне scope: live database encryption (слой Postgres); TLS in transit; application-level encryption поверх уже зашифрованного storage.

## Database backups

Метод: AES-256 или эквивалент.

Вариант storage-level (предпочтительный). Encrypted volumes или object storage SSE у провайдера. Проверить включение encryption у Selectel или аналога. Протестировать restore из зашифрованного storage.

Вариант dump-level. Команда вида pg_dump плюс gpg symmetric AES256 в файл с суффиксом gpg. Restore через gpg decrypt в pipe к pg_restore. Команды терминала — в docs/development при необходимости.

Ключи. Не в git и не в application config. Хранить в ops secret store. Ротация ежегодно или при компрометации. Отдельные ключи для prod и staging.

Retention. Production encrypted 30 дней. Daily encrypted 7 дней. WAL archives encrypted для PITR.

## File store backups

Storage: Selectel Object Storage или S3-совместимый bucket.

Включить server-side encryption SSE-S3 или SSE-KMS. Проверять заголовок x-amz-server-side-encryption AES256 на объектах. Bucket policy должна отклонять PUT без encryption.

Типы объектов под обязательное шифрование: identity documents, commercial invoices с данными клиента, agency contracts, payment confirmations, все user uploads.

## Verification

Database. Проверить encryption на bucket или volume. Restore на test DB и сверка count по form_payment. Файл бэкапа не должен читаться как plaintext SQL.

File store. Проверить policy encryption. Попытка upload без encryption должна получить отказ. Выборочная проверка headers существующих объектов.

## Access controls

Доступ к restore: ops lead полный; DevOps read-only verify; DBA create или restore; security officer audit ключей. Все обращения к бэкапам в audit log. Алерты на неожиданные downloads. Ежемесячный разбор access log.

Ключи prod с 2FA. Staging отдельно. Emergency escrow у executive или legal. Инциденты с доступом к ключам документировать.

## Compliance

GDPR и ПДн: бэкапы с ПДн encrypted. Финансовые данные encrypted at rest. Retention с удалением после срока. Право на erasure: процедура удаления записи из бэкапов при требовании регулятора.

Аудит цикла бэкапа фиксирует timestamp, метод и версию ключа, размер и location, результат verify, summary access log. Ежеквартально: encryption active, restore test, access review, key policy.

## Incident response

Сценарий unencrypted backup. Удалить plaintext. Проверить остальные. Ротировать ключи. Audit downloads. Зафиксировать remediation.

Сценарий leaked encryption key. Revoke key. Новый key. Re-encrypt недавние бэкапы. Audit usage. Уведомить security и DPO.

Сценарий storage breach. Если бэкапы encrypted, impact снижен. Ротировать credentials storage. Audit access. При утечке ключа — ротировать и ключ. Regulatory report при необходимости.

## Future

Автоматическая daily проверка encryption status с алертом. Автоматическая annual key rotation. Метрики encryption на dashboard со SLA 100 процентов encrypted в течение часа после создания.

## Related

См. [security-signoff-checklist.md](security-signoff-checklist.md) и [secrets-rotation-runbook.md](secrets-rotation-runbook.md).

## Sign-off

Ops Lead: _________________ Date: _________

Security Officer: _________________ Date: _________

Подтверждение. Database backups encrypted at rest. File store backups encrypted at rest. Keys not in git. Verification procedures tested. Access controls audited. Incident procedures reviewed.
