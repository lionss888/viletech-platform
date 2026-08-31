# Известные пробелы

Честный список ограничений MVP. Не блокеры для пилот demo при принятии оговорок readiness-and-limits.md.

## Nest parity semantics

331/331 route mapping done in R12 gate. Product depth differs: stubs shortcuts residual gap analysis items outside R11 Must Should.

## Hub integrations depth

Docs and mail HTTP contract verified in CI via make test-adapters with httptest.Server. Staging: `scripts/staging-smoke.sh` + `staging-env.example` for DOCS_URL / MAIL_URL. Dev compose uses stub when URLs empty (`docs/{id}/stub.pdf`).

## XLSX and templates

Nest form-payment XLSX and compliance export use real OOXML (`export.MinimalXLSX`). PDF generation payload includes agent template_id per PA (`docs_payload.go`); prod fidelity still depends on external docs service behind DOCS_URL.

## CI CD in vdp repo

GitHub Actions vdp-ci.yml jobs fast docs integration playwright. Release vdp-release.yml runs make release-gate. GitLab mirror documented in ci.md — **не реализован**; только по явной команде после P1–P5.

## FE app vs demo (2026-08-31)

App contour: JWT `vdp-auth-v1`, `lib/api/*`, `action-bridge`, React Query forms read/create. Demo: `/demo/*` + `ved-demo-state-v2` only under demo layout.

Partial: not all 52 UI actions wired to Nest PUT paths; справочники в app — без API (F6). Playwright: smoke + login specs; full journey needs compose-up.

## Playwright UI coverage

Six specs happy path partial reject provider ACL bank badge completed journey manager payment. Full browser matrix all roles times all statuses not covered. Backend compose-e2e covers API journeys including RH2 ICO reject refund full P5 advance shipment.

## Postgres test coverage

make test-integration with build tag integration runs five postgres tests in CI before compose-e2e. Unit HTTP gates remain memory driver by design for speed.

## Observability prod

Structured logs and observability.md baseline. Semantic alerts (`semantic-alerts.md`), runbooks (`runbooks/`), example Prometheus rules in repo. Deployed alerting — на стороне ops/staging.

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

Role ACL tested in unit e2e. Checklist `security-signoff-checklist.md`; prod config guard rejects dev JWT/S2S secrets. Formal customer sign-off pending.

## OCR policy

OCR is optional side-path only. `recognize_complete` in app advances draft without vendor OCR. Staging OCR worker optional; never on transactional payment commit. Disable OCR env → manual entry remains available.

При закрытии gap обновляйте readiness-and-limits.md и этот файл в одном PR.
