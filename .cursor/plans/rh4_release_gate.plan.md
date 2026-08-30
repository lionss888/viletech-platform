---
name: RH4 Release Gate
overview: "make release-gate агрегирует все gate'ы; vdp-release CI workflow; observability.md; sync known-gaps и readiness для pilot handover."
todos:
  - id: rh4-make-release-gate
    content: Makefile release-gate = integration-gate + playwright + test-integration + docs-format-check
    status: pending
  - id: rh4-ci-release
    content: workflow vdp-release.yml или job на tag / workflow_dispatch
    status: pending
  - id: rh4-observability-doc
    content: vdp/docs/operations/observability.md — correlation id, semantic alerts
    status: pending
  - id: rh4-known-gaps
    content: Обновить known-gaps.md — что RH закрыл / что остаётся
    status: pending
  - id: rh4-readiness
    content: Обновить pilot/readiness-and-limits.md — pilot ~75% honesty
    status: pending
  - id: rh4-master-dod
    content: Закрыть global DoD в vdp_reliability_master.plan.md todos
    status: pending
  - id: rh4-gate
    content: "DoD: make release-gate green на clean clone + compose"
    status: pending
isProject: false
---

# RH4 — Release Gate & Observability Baseline

## Meta

- **ID:** RH4 · **Группа:** Finал RH program · **Зависимости:** RH0, RH1, RH2, RH3 · **Оценка:** 1–2 дня
- **Known-gaps / readiness:** [`vdp/docs/pilot/`](../../vdp/docs/pilot/)
- **Master:** [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md)

## Scope

**In:**

- Unified `make release-gate` Makefile target
- CI workflow or job for pre-handover / tag `vdp-*` / manual dispatch
- [`vdp/docs/operations/observability.md`](../../vdp/docs/operations/observability.md) baseline
- Update [`known-gaps.md`](../../vdp/docs/pilot/known-gaps.md) and [`readiness-and-limits.md`](../../vdp/docs/pilot/readiness-and-limits.md)
- Close master global DoD checklist

**Out:**

- Full prod observability stack (Datadog/Grafana deploy)
- Security audit deliverable sign-off
- Nest data migration
- Claim «prod 100%» or «full Nest parity»

## Rules gate

**Обязательны:**

- [`честность-готовности`](../.cursor/rules/честность-готовности.mdc) — pilot ~75%, prod ~40% unless evidence
- [`развертывание-и-доставка`](../.cursor/rules/развертывание-и-доставка.mdc) — release-gate before promote
- [`devops-культура`](../.cursor/rules/devops-культура.mdc) — one command reproducibility
- [`устойчивость-и-наблюдаемость`](../.cursor/rules/устойчивость-и-наблюдаемость.mdc) — correlation id, semantic alerts doc
- [`тесты-архитектуры`](../.cursor/rules/тесты-архитектуры.mdc) — release-gate = pyramid top narrow
- [`правила-построения`](../.cursor/rules/правила-построения.mdc)

**Вне scope:** on-call runbooks for prod vendor incidents (outline only).

## Prerequisites

- [ ] RH0 CI pipeline operational
- [ ] RH1 `make test-integration` green
- [ ] RH2 E2E expansion + matrix
- [ ] RH3 `make test-adapters` green

## Работы

### 1. Makefile `release-gate`

```makefile
.PHONY: release-gate
release-gate:
	$(MAKE) test-integration
	$(MAKE) integration-gate
	$(MAKE) playwright-e2e
	$(MAKE) test-adapters
	@if [ -f scripts/docs-format-check.sh ] || grep -q docs-format-check Makefile; then $(MAKE) docs-format-check; fi
	@echo "release-gate green"
```

Order rationale:

1. `test-integration` — fast postgres signal
2. `integration-gate` — unit + compose-e2e
3. `playwright-e2e` — browser (separate failure domain)
4. `test-adapters` — hub HTTP contracts
5. docs format — if exists

Document in [`vdp/docs/development/makefile-reference.md`](../../vdp/docs/development/makefile-reference.md).

### 2. CI release workflow

Option A: `.github/workflows/vdp-release.yml`

- Trigger: `workflow_dispatch`, push tags `vdp-v*`
- Runs full `make release-gate` on runner with Docker
- Timeout ~60 min

Option B: job `release` in existing `vdp-ci.yml` — manual only

Document triggers in [`vdp/docs/operations/ci.md`](../../vdp/docs/operations/ci.md).

### 3. Observability doc

[`vdp/docs/operations/observability.md`](../../vdp/docs/operations/observability.md) (h1–h3, p):

**Correlation:** request id + form id in structured logs (reference existing log fields in core/hub).

**Semantic alerts (concept):**

- Forms stuck in `payment_processing` > N minutes
- Forms in `awaiting provider` without assignment > N hours
- Example log query patterns (vendor-agnostic text, not locked to Datadog)

**Not in MVP:** deployed alerting rules — document as staging/prod checklist.

### 4. Known-gaps sync

Update sections closed by RH program:

| Gap | After RH4 |
|-----|-----------|
| CI CD in vdp repo | Closed (GitHub Actions) if RH0 done |
| Postgres test coverage | Improved — integration tag + CI |
| Playwright UI coverage | Expanded per RH2 matrix — not full |
| Hub integrations | docs/mail HTTP in CI; Diadoc etc. staging-manual |
| Observability prod | Baseline doc — not operational stack |

Keep honesty: stub dev compose, security prod sign-off, Nest migration.

### 5. Readiness update

[`vdp/docs/pilot/readiness-and-limits.md`](../../vdp/docs/pilot/readiness-and-limits.md):

- Pilot handover: requires `make release-gate` green + acceptance of known-gaps
- Prod go-live: explicit blockers list unchanged or refined

### 6. Master DoD closure

Mark master todos complete when all RH0–RH4 DoD verified.

## Verify

On clean machine / CI runner:

```sh
git clone … && cd viletech-platform/vdp
make compose-up          # or CI does this
make release-gate
```

Expected: exit 0, all sub-targets green.

## DoD

- [ ] `make release-gate` target exists and documented
- [ ] Release CI workflow or manual job documented
- [ ] observability.md published
- [ ] known-gaps + readiness updated
- [ ] Master global DoD items checked with evidence (CI URL or local log)
- [ ] No «prod 100%» language

## Honesty note — pilot vs prod after full RH program

**Pilot (~70–75%):** automated regression, expanded E2E matrix, adapter HTTP tests, release command.

**Prod (~40–45%):** real vendor integrations, security sign-off, operational alerting, load testing — still open.

## Handover checklist (pilot)

- [ ] `make release-gate` green
- [ ] [`e2e-coverage-matrix.md`](../../vdp/docs/development/e2e-coverage-matrix.md) reviewed with customer
- [ ] [`staging-checklist.md`](../../vdp/docs/operations/staging-checklist.md) for staging env setup
- [ ] Seed accounts documented in getting-started
