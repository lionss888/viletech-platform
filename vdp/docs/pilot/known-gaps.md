# Известные пробелы

Честный список ограничений MVP. Не блокеры для пилот demo при принятии оговорок readiness-and-limits.md. Дата сверки 2026-09-16: in-scope маршруты вводных покрыты domain to E2E при зелёной ci-pr-pilot (import advance, RATE_ON_PP, export PAY_FROM_EXPORT, refund, shipment branch). Residual: bank live webhook, PDF pixel, analytics placeholders, продукт логистов, POSTPAY_FIXED_RATE, own OCR PRIMARY, Nest data migration, полный browser matrix.

## Nest parity semantics

331/331 route mapping done in R12 gate. Product depth differs: stubs shortcuts residual gap analysis items outside R11 Must Should.

## Hub integrations depth

Docs and mail HTTP contract verified in CI via make test-adapters with httptest.Server. Staging: make staging-smoke or scripts/staging-smoke.sh plus staging-env.example for DOCS_URL and MAIL_URL. Phase 3 (2026-09-15): local compose green with live docs-service and mail-gateway and sms-gateway URLs (not empty fixture). Alpha public core health and seed login OK; hub docs mail remain loopback on VM; remote on-host smoke and rollback need refreshed DEPLOY_SSH_KEY (SSH publickey denied from workstation). Empty DOCS_URL or MAIL_URL still stubs in hub. Diadoc ONEC bank OCR stay fixture or manual until vendor URL in secret store — do not claim 100 percent live.

## XLSX and templates

Nest form-payment XLSX and compliance export use real OOXML (export.MinimalXLSX). PDF generation payload includes agent template_id per PA (docs_payload.go); prod fidelity still depends on external docs service behind DOCS_URL. Primary поручение без курса на POSTPAY_RATE_ON_PP поддержано в payload; pixel fidelity PDF и legal sign-off шаблонов по ПА — открыты.

## Import routes IMP package

Пакет IMP0–IMP7 закрыт на уровне домена API и кабинетов Manager или Treasurer. Аванс: казначей confirm-payment с опциональным execution_deadline → payment_processing (IMP7 @pilot-matrix); API rate/commission доступен до signing_order для §10.2 п.1 primary-фиксации (r12_verification_test.go), UI workshop отдельно. Постоплата POSTPAY_RATE_ON_PP: provider-first, курс и три режима вознаграждения после ПП, доп. поручение, казначей → report_waiting; полный browser ladder до completed в pilot-matrix-postpay-rate (IMP8 @pilot-matrix). Verify: unit HTTP FE unit, ci-pr-pilot зелёная 2026-09-16 включая полный browser suite и pilot-matrix. Не заявлено: полный wizard payment_method:advance end-to-end. Вне scope: POSTPAY_FIXED_RATE, экспортный overpay-treasurer redesign, PDF primary без курса как отдельный UX-воркшоп.

## Export routes Phase 5-6

Экспортный маршрут PAY_FROM_EXPORT закрыт на уровне домена API и кабинетов Manager и Treasurer (Phase 5 domain, Phase 6 UI/E2E). State machine: форма принята → advance_signing_order → получение валюты от контрагента → казначей confirm с методом PAY_FROM_EXPORT → treasurer_signing → User верификационный документ → treasurer_complete → completed. Отделён от импортного покрытия клиента без смены импортной логики. Unit: export_machine_test.go (happy path, transition matrix, role AuthZ, payment method guard, idempotency). HTTP: export_flow_test.go (creation, happy path, treasurer AuthZ, invalid transitions). FE: wizard direction export, actions.ts treasurer export CTA, statuses labels, action-bridge mapping, unit tests manager-payment/wizard-steps. UI E2E: pilot-matrix-export.spec.ts @pilot-matrix happy path до completed. CI: path-filter export surface (actions/statuses/wizard-steps/e2e/formpayment). Verify: ci-pr-pilot 2026-09-16 включает export spec (зелёный). Не заявлено: полный wizard export payment_method end-to-end, множественные экспортные сценарии за пределами treasurer happy path, browser матрица всех экспортных статусов × ролей. Казначейские кабинеты export и UI воркшоп верификационных полей — отдельно от Phase 6 scope.

## B.2 Documents (2026-08 pilot)

Готовность ~90% after B.2 wave 1–2 backend + FE recovery (2026-08-31). Backend: org signer fields, enriched docs payload, 15MB upload limit, DOCS API, docs-service, compose-e2e docs assert. FE: OrgProfileCard (PATCH org signer/contact), wizard upload with 413 guard, document download via preview API, payment proof soft warning. Still open: customer workshop D4/D5 (report N orders, RUB formulas), legal template sign-off per PA, prod PDF pixel fidelity. Matrix: docs/pilot/b2-uat-field-matrix.md. Diadoc/OCR: manual / optional per b2-decisions.md.

## FE app contour (post-Lovable)

JWT app contour restored after Lovable sync regression. Волны UX 0–4 и клиентские правки parties wizard docs provider report close закрыты в коде. Shared FilePickButton и rule fe-interaction-contracts закрепляют жест загрузки через filechooser. Browser UAT на compose seed выборочный: PR smoke узкий; pilot-matrix на template fixture; полный матричный browser all roles × all statuses не покрыт. Customer robot fixture pack awaiting_import.

FE ops caveat: default VDP_API_PROXY_TARGET в fe vite и server proxy указывает на alpha host если env не задан; для локального compose задавайте VDP_API_PROXY_TARGET=http://localhost:8080 явно перед запуском dev-сервера. exactOptionalPropertyTypes в fe tsconfig выключен после sync.

## CI CD in vdp repo

GitHub Actions: vdp-ci.yml (fast/docs/integration/playwright; на PR path-filter может включить playwright-pilot-matrix при касании ladder surface), vdp-release.yml (make release-gate), vdp-images.yml (GHCR digest from branch or tag, GitHub Release catalog, GitLab registry copy), vdp-deploy.yml (alpha/beta/gamma/demo/test compose by digest), vdp-deploy-schedule.yml, vdp-preview.yml, vdp-lovable-sync.yml, vdp-mirror-gitlab.yml. Promote policy API and console live under vdp/release-gate and vdp/release-gate-console; that is not the same as the Makefile target make release-gate. GitLab CI: root .gitlab-ci.yml — parallel regression plus promote jobs without rebuild when Environment secrets exist. Partial CD: six named VMs are not all bootstrapped until ops runs bootstrap-host.sh. Green pipeline ≠ prod product ready. Git hooks post-commit post-merge pre-push могут слать TG notify для eng (sanitize).

## Playwright UI coverage

Playwright: login-form, user-submit, happy-path, completed-journey, reject-path, ico-org, provider-acl, bank-badge, manager-payment, manager-hides-drafts, wave и pilot-form-flow и pilot-matrix specs: full-ladder, postpay-rate, export, refund, shipment. ci-pr-pilot 2026-09-16: 9 passed @pilot-matrix. Full browser matrix all roles × all statuses not covered.

## CTA / process-roles touchpoints

Status or CTA copy changes must land in FE actions.ts (+ continuity labels), action-bridge, core AuthZ, and scenarioverify when journeys depend on them. Continuity contract test: cta-continuity-contract.test.ts. Seed wipe on local compose: SEED_WIPE_FORMS=1 (явный флаг перекрывает demo) / make core-seed-reset / кнопка «Очистить все заявки» на /testing (POST admin/probe-data/wipe) — accounts kept, forms cleared.

## Postgres test coverage

make test-integration with build tag integration runs five postgres tests in CI before compose-e2e. Unit HTTP gates remain memory driver by design for speed.

## Observability prod

Phase 4 Ops Excellence complete (2026-09-15). Correlation: hub logger enhanced with context-based form_payment_id and event_id matching core pattern. Dispatcher enriches context before plugin execution. Full flow documented in correlation-logging.md. Tests: core/pkg/logger/logger_test.go, hub/pkg/logger/logger_test.go. 

Semantic alerts: Prometheus rules defined in ops/prometheus-rules.example.yml covering stuck payments (30m warning, 2h critical), hub inbox failures (5+ warning, 10+ critical per hour), gateway health (DOCS MAIL SMS), compliance backlog (24h warning, 72h critical), and refund delays. Deployment script scripts/deploy-alerts-staging.sh with verification checklist ready.

Runbooks: stuck-payment.md and hub-failure.md with dry-run verification. On-call guide established at on-call-guide.md with rotation, escalation paths, and common scenarios.

Awaiting ops infrastructure: Prometheus with /metrics endpoints from core and hub, Alertmanager with on-call notification channel, live alert firing test. Phase 4 deliverables met: alerting architecture defined, tested, and deployment-ready.

## Migration from Nest

Data migration legacy Nest monolith not in vdp scope. Greenfield seed data only.

## Out of scope roadmap

Полный флоу логистов как отдельный продукт и доска из секции 8 вводных. Ветка SHIPMENT_* в заявке это закрывающие документы отгрузки внутри form-payment не логистический модуль. Product modules analytics and assistant under vdp/analytics and vdp/assistant remain placeholders (.gitkeep). Full BDUI schema engine. Client feedback items waiting Dasha forms: provider return-funds UI and Word cycle for order or report templates.

## Gap analysis reference

Internal analysis заметки/gap-analysis-backend.md wider than R11 closed items. Pilot package does not include internal notes path; summary captured here.

## Phase 8 shipment branch

Ветка отгрузки закрыта как опциональный контур form-payment не как процент полного логистического продукта. Domain unit HTTP FE ShipmentPanel CTA Manager User E2E pilot-matrix-shipment.spec.ts compose-e2e P5. Happy path остаётся report accept completed. Не заявлено: отдельный кабинет логистов статусы ожидания информации от логистов трекинг груза. Verify: ci-pr-pilot 2026-09-16 включает shipment spec (зелёный). Не входит в обязательный PR smoke.

## Residual R11

Must Should and section 9 extension marked ParityDone in gates. Residual non-product gaps documented in gap analysis medium risk.

## Copy RW programs

RW1–RW9 copy layer and glossariy synced per RW9 gate. Root wording unchanged by design.

## Security prod sign-off

Role ACL tested in unit e2e including treasurer AuthZ on confirm. Checklist security-signoff-checklist.md. Prod config guard rejects dev JWT/S2S secrets. Milestone 1 2026-09-15: contractor software items on the checklist are marked done; локальная сборочная команда handover green. Customer signature and handover-secrets rotation remain open as a known-gap for import UAT. Formal customer sign-off pending. Alpha public core health 200. Remote SSH rotate still blocked until DEPLOY_SSH_KEY refresh.

## OCR / document extraction

Dual-track behind hub OCR_URL (vdp/extraction). Fixture works without vendor keys.
Pilot PRIMARY equals Docling (EXTRACTION_PRIMARY equals docling, EXTRACTION_DOCLING_URL equals http://docling:5001, EXTRACTION_FALLBACK equals doctr, EXTRACTION_DOCTR_URL equals http://doctr:5002, OCR_TIMEOUT_MS equals 180000, GATEWAY_TIMEOUT equals 180). Yandex is not PRIMARY on this pilot. Smoke: make extraction-docling-smoke and make extraction-doctr-smoke.
HITL confirm writes gold JSONL for offline train. Own model equals not ready for prod PRIMARY until Wave E held-out eval (see architecture/extraction.md). Commercial Yandex path remains available later via the same port (YANDEX_* plus EXTRACTION_PRIMARY equals yandex). Smoke for that path: make extraction-yandex-smoke. Keys leaked outside secret store must be rotated.

Own CPU: Ollama Qwen2.5-3b plus few-shot is testable (EXTRACTION_PRIMARY equals own, OLLAMA_BASE_URL); make extraction-ollama-ensure once; make extraction-eval-own keeps ready_for_prod_primary false. Weight-based own model equals Wave E after GPU (lora_recipe.md).

Applied skips: YaLM 100B self-host; Onyx as OCR/IE. HF equals LoRA tooling only; open-llms equals license checklist before train (extraction/train/lora_recipe.md).

OCR is optional side-path only. recognize_complete in app advances draft without vendor OCR. Never on transactional payment commit. Manual entry remains available.

Wizard and form card: poll waits for ExtractionResult schema v1 (not form dump in invoice_json); timeout shows manual-fill banner; CTA Просмотр данных or Статус распознавания stays available with documents through early post-submit statuses including organization waiting. AttachHsCodes merges hs_codes without wiping meta.engine_id.

Alpha Docling pilot: set the same keys in .env.deploy, recreate docling plus extraction plus hub plus core after Images Deploy. On-host verify health primary equals docling and one live upload. Workstation SSH may stay blocked (publickey denied) until DEPLOY_SSH_KEY refresh; Deploy workflow still covers the host.

## Milestone 2 in-scope вводных

2026-09-16. Честный claim: in-scope маршруты вводных покрыты domain to E2E. §9 чеклист синхронизирован с фактом кода: исходные девять пунктов domain/API закрыты; плюс export PAY_FROM_EXPORT и ветка shipment. Не 100 процентов продукта. Остаток: живой bank webhook, pixel PDF, продукт логистов, POSTPAY_FIXED_RATE, analytics/assistant, own OCR PRIMARY, Nest data migration, полный browser matrix, ротация секретов заказчика.

При закрытии gap обновляйте readiness-and-limits.md и этот файл в одном PR.
