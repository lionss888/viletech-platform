# Staging checklist

Перед UAT или staging go-live с реальными интеграциями проверьте env и контракты. MVP compose работает со stubs без этих URL.

## Hub documents DOCS_URL

Stub docs id stub.pdf без prod URL. Staging нужен реальный file store или docs service URL. Без URL генерация документов не даёт боевых файлов.

## Diadoc

Контракт и callback есть. Prod signing требует Diadoc credentials и webhook. Manual signing path доступен без Diadoc в MVP UI.

## Mail notify

Hub mail adapter stub. Staging нужен SMTP or provider API for notifications.

## OCR recognition

recognize_complete в app сразу to draft без OCR. Staging OCR worker optional side path not transactional payment path.

## Telegram 1C partner

Extended Nest modules R9. Callback contract only until vendor config.

## XLSX export

Placeholder bytes not real Excel. Staging replace hub xlsx generator or disable feature flag.

## Bank webhook

BankSettingsPanel webhook URL. Staging HTTPS endpoint with auth for status push.

## Postgres

Separate core and hub databases. Backups encrypted. No shared schema with Nest legacy.

## Observability staging

Structured logs with correlation id and form id. Tracing OpenTelemetry recommended. Semantic alert stuck forms awaiting provider.

## Security review before prod

AuthZ every endpoint. Provider DTO audit. Secrets rotation. File ACL documents. S2S mTLS optional maturity path.
