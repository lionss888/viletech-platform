# Staging checklist

Перед UAT или staging go-live с реальными интеграциями проверьте env и контракты. MVP compose работает со stubs без этих URL.

Шаблон env: [staging-env.example](staging-env.example). Smoke: scripts/staging-smoke.sh из каталога vdp.

## Hub documents DOCS_URL

CI verified. Test docs_http_test.go in make test-adapters asserts POST payload and retry on 503. Staging: export DOCS_URL and run staging-smoke. Dev stub docs/{id}/stub.pdf when URL empty. Payload includes template_id per payment agent.

## Diadoc

CI contract plus smart stub timeout. Staging manual. Prod signing requires Diadoc credentials and webhook. Manual download/upload path remains in UI. Empty DIADOC_URL uses fixture. Do not claim 100 percent Diadoc.

## Mail notify

CI verified. Test mail_http_test.go in make test-adapters plus mail-gateway unit tests. Staging: MAIL_URL in staging-smoke (health + probe). Compose: mail-gateway local provider at http://mail-gateway:8091/notify. Empty MAIL_URL still stubs in hub (dev without gateway). Switch SMTP with MAIL_PROVIDER=smtp and host secrets — not a core change.

## SMS notify

CI verified on HTTP contract (sms-gateway + hub sms adapter). Catalog: OTP and critical events only. Compose: sms-gateway local provider. Staging: SMS_URL optional in staging-smoke. External SMSC: SMS_PROVIDER=http + SMS_PROVIDER_URL.

## Telegram

CI partial (bind AuthZ plus fixture notify). Staging: TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME. Empty token uses hub fixture. One platform bot; personal link plus work-chat join (approve: admin/manager).

## 1C

CI adapter tests (cover/fee, 409 idempotent, timeout). Not a new service. Staging: ONEC_URL in env when a stand exists. Empty URL uses fixture. Do not claim 1C ready without URL.

## OCR recognition

Policy: optional side-path only. recognize_complete in core advances draft without vendor OCR. Staging OCR worker optional — not on payment commit path. If OCR unavailable, user manual entry remains. Do not auto-approve or auto-pay from OCR output.

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

make release-gate green locally or vdp-release workflow. Tag vdp-v* triggers vdp-images (gate + GHCR digest for core/hub/docs/fe) and vdp-deploy → alpha (auto after Images on main). beta/gamma: workflow_dispatch VDP Deploy with GitHub Environment (gamma: required reviewers). Review e2e-coverage-matrix.md and known-gaps with customer.

## Alpha host bootstrap (one-time)

Step 1. Generate the deploy key locally with ssh-keygen, type ed25519, output file ~/.ssh/vdp_deploy_ed25519, empty passphrase, comment vdp-deploy. GitHub Actions cannot type a passphrase, so the CI key must have none.

Step 2. On the Ubuntu VM as root, run bootstrap-host.sh with DEPLOY_PUBKEY set to the contents of the public key, VDP_DOMAIN set to the host name (for example alpha.vedy.io) and ENVIRONMENT set to the environment name. Copy the script to the host first, or pipe it over ssh. Without a domain, omit VDP_DOMAIN for an IP-only HTTP demo.

Step 3. Confirm that /opt/vdp/.env.deploy holds non-default JWT_SECRET and HUB_SHARED_SECRET, and that the variables with suffix _BIND point to 127.0.0.1 so only Caddy is exposed.

Step 4. Fill the GitHub Environment secrets for alpha: DEPLOY_HOST, DEPLOY_USER set to deploy, DEPLOY_PATH set to /opt/vdp, and DEPLOY_SSH_KEY holding the private key contents.

Step 5. Push the branch, run workflow VDP Images, then VDP Deploy against environment alpha. Verify with staging-smoke.sh on the host and by opening the login page over HTTPS on the configured domain.
