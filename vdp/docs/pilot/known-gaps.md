# Известные пробелы

Честный список ограничений MVP. Не блокеры для пилот demo при принятии оговорок readiness-and-limits.md.

## Nest parity semantics

331/331 route mapping done in R12 gate. Product depth differs: stubs shortcuts residual gap analysis items outside R11 Must Should.

## Hub integrations depth

Docs and mail HTTP contract verified in CI via make test-adapters with httptest.Server. Staging: scripts/staging-smoke.sh + staging-env.example for DOCS_URL / MAIL_URL. Dev compose uses stub when URLs empty (docs/{id}/stub.pdf).

## XLSX and templates

Nest form-payment XLSX and compliance export use real OOXML (export.MinimalXLSX). PDF generation payload includes agent template_id per PA (docs_payload.go); prod fidelity still depends on external docs service behind DOCS_URL.

## B.2 Documents (2026-08 pilot)

Готовность ~90% after B.2 wave 1–2 backend + FE recovery (2026-08-31). Backend: org signer fields, enriched docs payload, 15MB upload limit, DOCS API, docs-service, compose-e2e docs assert. FE: OrgProfileCard (PATCH org signer/contact), wizard upload with 413 guard, document download via preview API, payment proof soft warning. Still open: customer workshop D4/D5 (report N orders, RUB formulas), legal template sign-off per PA, prod PDF pixel fidelity. Matrix: docs/pilot/b2-uat-field-matrix.md. Diadoc/OCR: manual / optional per b2-decisions.md.

## FE app contour (post-Lovable)

2026-08-31: Lovable sync had regressed FE to demo-only mock; RI re-exec restored JWT app (lib/api, auth session, platform-store, /demo/* isolation). Browser UAT on compose seed ~70–75% (not all B.2 journeys in Playwright). Do not mark W0–W6 closed without files on disk + green gates.

## CI CD in vdp repo

GitHub Actions: vdp-ci.yml (fast/docs/integration/playwright required User journeys), vdp-release.yml (make release-gate), vdp-images.yml (GHCR digest from branch or tag, GitHub Release catalog, GitLab registry copy), vdp-deploy.yml (alpha/beta/gamma/demo/test compose by digest), vdp-deploy-schedule.yml, vdp-preview.yml, vdp-lovable-sync.yml, vdp-mirror-gitlab.yml. Promote policy API and console live under vdp/release-gate and vdp/release-gate-console; that is not the same as the Makefile target make release-gate. GitLab CI: root .gitlab-ci.yml — parallel regression plus promote jobs without rebuild when Environment secrets exist. Partial CD: six named VMs are not all bootstrapped until ops runs bootstrap-host.sh. Green pipeline ≠ prod product ready.

## Playwright UI coverage

Playwright: login-form, user-submit, happy-path, completed-journey, reject-path, ico-org, provider-acl, bank-badge, manager-payment, manager-hides-drafts. Full browser matrix all roles × all statuses not covered. Shared catalog scenarioverify; Root /testing runs API scenarios on demand (catalog size ≠ footer form count). Backend compose-e2e covers API journeys including RH2 ICO reject refund full P5 advance shipment. PR smoke includes reject-path + provider-acl.

## CTA / process-roles touchpoints

Status or CTA copy changes must land in FE actions.ts (+ continuity labels), action-bridge, core AuthZ, and scenarioverify when journeys depend on them. Continuity contract test: cta-continuity-contract.test.ts. Seed wipe on local compose: SEED_WIPE_FORMS / make core-seed-reset — accounts kept, forms cleared.

## Postgres test coverage

make test-integration with build tag integration runs five postgres tests in CI before compose-e2e. Unit HTTP gates remain memory driver by design for speed.

## Observability prod

Structured logs and observability.md baseline. Semantic alerts (semantic-alerts.md), runbooks (runbooks/), example Prometheus rules in repo. Deployed alerting — на стороне ops/staging.

## Migration from Nest

Data migration legacy Nest monolith not in vdp scope. Greenfield seed data only.

## Out of scope roadmap

Logistics module analytics assistant full BDUI schema engine.

## Gap analysis reference

Internal analysis заметки/gap-analysis-backend.md wider than R11 closed items. Pilot package does not include internal notes path; summary captured here.

## Residual R11

Must Should and section 9 extension marked ParityDone in gates. Residual non-product gaps documented in gap analysis medium risk.

## Copy RW programs

RW1–RW9 copy layer and glossariy synced per RW9 gate. Root wording unchanged by design.

## Security prod sign-off

Role ACL tested in unit e2e. Checklist security-signoff-checklist.md; prod config guard rejects dev JWT/S2S secrets. Formal customer sign-off pending.

## OCR / document extraction

Dual-track behind hub OCR_URL (vdp/extraction). Fixture works without Yandex keys.
HITL confirm writes gold JSONL for offline train. Own model equals not ready for prod PRIMARY until Wave E held-out eval (see architecture/extraction.md). Commercial path: wire via gitignored .env (YANDEX_* plus EXTRACTION_PRIMARY equals yandex, fallback fixture). Smoke: make extraction-yandex-smoke. Keys leaked outside secret store must be rotated.

Own CPU: Ollama Qwen2.5-3b plus few-shot is testable (EXTRACTION_PRIMARY equals own, OLLAMA_BASE_URL); make extraction-ollama-ensure once; make extraction-eval-own keeps ready_for_prod_primary false. Weight-based own model equals Wave E after GPU (lora_recipe.md).

Applied skips: YaLM 100B self-host; Onyx as OCR/IE. HF equals LoRA tooling only; open-llms equals license checklist before train (extraction/train/lora_recipe.md).

OCR is optional side-path only. recognize_complete in app advances draft without vendor OCR. Never on transactional payment commit. Manual entry remains available.

При закрытии gap обновляйте readiness-and-limits.md и этот файл в одном PR.
