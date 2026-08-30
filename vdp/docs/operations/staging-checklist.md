# Staging checklist

Перед UAT или staging go-live с реальными интеграциями проверьте env и контракты. MVP compose работает со stubs без этих URL.

Шаблон env: [staging-env.example](staging-env.example). Smoke: `scripts/staging-smoke.sh` из каталога `vdp`.

## Hub documents DOCS_URL

CI verified. Test docs_http_test.go in make test-adapters asserts POST payload and retry on 503. Staging: export DOCS_URL and run staging-smoke. Dev stub `docs/{id}/stub.pdf` when URL empty. Payload includes template_id per payment agent.

## Diadoc

CI not verified. Staging manual only. Контракт и callback есть. Prod signing требует Diadoc credentials и webhook. Manual signing path доступен без Diadoc в MVP UI.

## Mail notify

CI verified. Test mail_http_test.go in make test-adapters. Staging: MAIL_URL in staging-smoke. Hub mail adapter stub when URL empty.

## OCR recognition

Policy: optional side-path only. `recognize_complete` in core advances draft without vendor OCR. Staging OCR worker optional — not on payment commit path. If OCR unavailable, user manual entry remains. Do not auto-approve or auto-pay from OCR output.

## Telegram 1C partner

CI not verified. Staging manual. Extended Nest modules R9. Callback contract only until vendor config.

## XLSX export

CI verified via nest_xlsx_test and compliance xlsx routes. Real OOXML MinimalXLSX. No placeholder bytes on export paths.

## Bank webhook

CI partial via compose RD9 spot and staging-smoke optional BANK_WEBHOOK_URL. Staging manual HTTPS. BankSettingsPanel webhook URL.

## Postgres

Separate core and hub databases. Backups encrypted checklist in security-signoff-checklist.md. No shared schema with Nest legacy.

## Observability staging

Structured logs with correlation id and form id per observability.md. Semantic alerts semantic-alerts.md. Runbooks runbooks/.

## Security review before prod

security-signoff-checklist.md. AuthZ every endpoint. Provider DTO audit. Secrets rotation. File ACL documents. S2S mTLS optional maturity path.

## Release gate before pilot handover

make release-gate green locally or vdp-release workflow. Review e2e-coverage-matrix.md and known-gaps with customer.
