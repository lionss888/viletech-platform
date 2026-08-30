---
name: RH3 Staging Adapters
overview: "Hub docs/mail tests через httptest.Server (не stub-only); staging-checklist sync; make test-adapters; optional workflow_dispatch staging-smoke."
todos:
  - id: rh3-docs-http-test
    content: docs adapter test с DOCS_URL=httptest — assert POST payload + retries
    status: pending
  - id: rh3-mail-http-test
    content: mail adapter test с MAIL_URL=httptest — assert notify payload
    status: pending
  - id: rh3-make-target
    content: make test-adapters (hub adapter package tests)
    status: pending
  - id: rh3-staging-checklist
    content: staging-checklist.md — CI vs staging-manual per integration
    status: pending
  - id: rh3-xlsx-honesty
    content: XLSX stub flag or minimal valid bytes + known-gaps honesty
    status: pending
  - id: rh3-ci-step
    content: test-adapters step в CI job fast или integration
    status: pending
  - id: rh3-gate
    content: "DoD: adapter tests fail if only stub path covered"
    status: pending
isProject: false
---

# RH3 — Staging Adapters & External Smoke

## Meta

- **ID:** RH3 · **Группа:** Hub integrations · **Зависимости:** RH0 (CI), R8 adapters baseline · **Оценка:** 2–3 дня
- **Known-gaps:** «Hub integrations depth», stub items — [`vdp/docs/pilot/known-gaps.md`](../../vdp/docs/pilot/known-gaps.md)
- **Master:** [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md)

## Scope

**In:**

- HTTP-path tests for hub docs and mail adapters (not only `baseURL == ""` stub)
- `make test-adapters` target
- Sync [`vdp/docs/operations/staging-checklist.md`](../../vdp/docs/operations/staging-checklist.md) with CI coverage column
- XLSX honesty (stub flag or minimal valid file)
- Optional `workflow_dispatch` staging-smoke (documented, secrets outside repo)

**Out:**

- Prod credentials in git
- Real Diadoc/TG/1C vendor connectivity in CI (staging-manual unless fake server added later)
- OCR ML pipeline in transactional path
- Replacing all stubs with prod services

## Rules gate

**Обязательны:**

- [`интеграция-и-события`](../.cursor/rules/интеграция-и-события.mdc) — hub callbacks → core SM only; идемпотентность
- [`go-resilience-security`](../.cursor/rules/go-resilience-security.mdc) — timeouts, retries on adapter HTTP
- [`устойчивость-и-наблюдаемость`](../.cursor/rules/устойчивость-и-наблюдаемость.mdc) — degrade without wrong status
- [`безопасность-ролей-и-данных`](../.cursor/rules/безопасность-ролей-и-данных.mdc) — no PII in adapter logs/tests
- [`serverless-и-faas`](../.cursor/rules/serverless-и-faas.mdc) — OCR side-path only
- [`тесты-архитектуры`](../.cursor/rules/тесты-архитектуры.mdc) — smart stub / httptest server
- [`честность-готовности`](../.cursor/rules/честность-готовности.mdc)
- [`правила-построения`](../.cursor/rules/правила-построения.mdc)

**Вне scope:** mTLS to prod vendor; full S3 integration.

## Prerequisites

- [x] R8 hub adapters structure — [`vdp/hub/internal/adapters/`](../../vdp/hub/internal/adapters/)
- [x] Existing stub tests — [`docs_test.go`](../../vdp/hub/internal/adapters/docs/docs_test.go)
- [ ] RH0 CI for running adapter tests

## Stub anchors (current)

| Adapter | Stub trigger | File |
|---------|--------------|------|
| Docs | `DOCS_URL` empty | [`docs.go`](../../vdp/hub/internal/adapters/docs/docs.go) |
| Mail | `MAIL_URL` empty | [`mail.go`](../../vdp/hub/internal/adapters/mail/mail.go) |
| Kontur | always stub response | [`organization.go`](../../vdp/core/internal/service/organization.go) |
| XLSX | placeholder bytes | [`nest_form_routes.go`](../../vdp/core/internal/transport/http/nest_form_routes.go) |

## Работы

### 1. Docs adapter HTTP test

Extend or add `docs_http_test.go`:

- Start `httptest.Server` recording POST body
- Set `DOCS_URL` to server URL
- Execute `Plugin.Execute(ctx, "generate", params)`
- Assert: JSON payload contains `form_payment_id`; retries on 503 (if resilience configured)
- Test must **fail** if only stub branch runs when URL is set

### 2. Mail adapter HTTP test

Same pattern for mail notify action:

- Assert no PII fields in logged/stub payload beyond business ids
- Retry behavior on timeout

### 3. Makefile `test-adapters`

```makefile
test-adapters:
	cd $(HUB_DIR) && go test ./internal/adapters/...
```

Include in CI `fast` job (no docker needed).

### 4. Staging checklist update

[`vdp/docs/operations/staging-checklist.md`](../../vdp/docs/operations/staging-checklist.md):

For each integration (DOCS, Diadoc, Mail, OCR, TG, 1C, XLSX, Bank webhook):

- Verified in CI (yes/no — which test)
- Staging manual only (yes/no)
- Required env vars (names only, no secrets)

### 5. XLSX honesty

Option A: minimal valid xlsx bytes in test fixture (small real file).
Option B: env `XLSX_STUB=1` default in dev + document in known-gaps.

Do not claim Excel export prod-ready without real generator.

### 6. Optional staging-smoke workflow

Document in [`vdp/docs/operations/ci.md`](../../vdp/docs/operations/ci.md):

- `workflow_dispatch` job `staging-smoke`
- Requires repo secrets: `STAGING_DOCS_URL`, etc.
- Not required for PR green — manual pre-UAT only

### 7. Dispatcher integration

Verify [`dispatcher_test.go`](../../vdp/hub/internal/dispatcher/dispatcher_test.go) still passes; extend if docs.generate path needs HTTP coverage at dispatcher level.

## Verify

```sh
cd vdp/hub && go test ./internal/adapters/docs/... -v
cd vdp/hub && go test ./internal/adapters/mail/... -v
cd vdp && make test-adapters
cd vdp && make test   # regression
```

## DoD

- [ ] docs + mail HTTP tests green (not stub-only coverage)
- [ ] `make test-adapters` in Makefile + CI fast job
- [ ] staging-checklist.md synced with CI column
- [ ] XLSX honesty documented
- [ ] known-gaps hub section updated

## Honesty note

После RH3: **docs/mail contract** проверен через HTTP fake server в CI. **Diadoc, TG, 1C, prod OCR, real S3** — staging-manual until fake servers or staging env. Compose dev still uses stub when env URL empty.

## Failure modes to test (smart stub)

- Hub 5xx → retry, form status unchanged in core (reference R8 DoD)
- Timeout → explicit error, no silent success
