# Staging checklist

Перед UAT или staging go-live с реальными интеграциями проверьте env и контракты. MVP compose работает со stubs без этих URL.

## Hub documents DOCS_URL

CI verified. Test docs_http_test.go in make test-adapters asserts POST payload and retry on 503. Staging manual. Stub docs id stub.pdf без prod URL. Staging нужен реальный file store или docs service URL. Env DOCS_URL.

## Diadoc

CI not verified. Staging manual only. Контракт и callback есть. Prod signing требует Diadoc credentials и webhook. Manual signing path доступен без Diadoc в MVP UI.

## Mail notify

CI verified. Test mail_http_test.go in make test-adapters asserts notify HTTP without stub when MAIL_URL set. Staging manual. Hub mail adapter stub when URL empty. Staging нужен SMTP or provider API. Env MAIL_URL.

## OCR recognition

CI not verified. Staging optional side path. recognize_complete в app сразу to draft без OCR. Staging OCR worker optional not transactional payment path.

## Telegram 1C partner

CI not verified. Staging manual. Extended Nest modules R9. Callback contract only until vendor config.

## XLSX export

CI not verified. Placeholder bytes not real Excel per known-gaps honesty. Staging replace hub xlsx generator or set disable feature. Dev returns PK xlsx-placeholder.

## Bank webhook

CI partial via compose RD9 spot only. Staging manual HTTPS. BankSettingsPanel webhook URL. Staging endpoint with auth for status push.

## Postgres

Separate core and hub databases. Backups encrypted. No shared schema with Nest legacy. CI integration job uses postgres service for make test-integration.

## Observability staging

Structured logs with correlation id and form id per observability.md. Tracing OpenTelemetry recommended. Semantic alert stuck forms awaiting provider.

## Security review before prod

AuthZ every endpoint. Provider DTO audit. Secrets rotation. File ACL documents. S2S mTLS optional maturity path.

## Release gate before pilot handover

make release-gate green locally or vdp-release workflow. Review e2e-coverage-matrix.md and known-gaps with customer.
