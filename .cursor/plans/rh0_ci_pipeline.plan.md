---
name: RH0 CI Pipeline
overview: "GitHub Actions: jobs fast (unit), integration (compose-e2e), playwright (отдельно), docs. CI/CD владеет gate'ами стабильности."
todos:
  - id: rh0-workflow
    content: Создать .github/workflows/vdp-ci.yml с jobs fast/integration/playwright/docs
    status: pending
  - id: rh0-ci-doc
    content: Документ vdp/docs/operations/ci.md — topology, triggers, branch protection
    status: pending
  - id: rh0-known-gaps
    content: Обновить known-gaps пункт CI CD (GitHub primary)
    status: pending
  - id: rh0-gate
    content: "DoD: pipeline green на main; integration и playwright — раздельные jobs"
    status: pending
isProject: false
---

# RH0 — CI/CD Pipeline & Gate Topology

## Meta

- **ID:** RH0 · **Группа:** Infra / CI · **Зависимости:** RD10 green локально · **Оценка:** 1–2 дня
- **Known-gaps:** «CI CD in vdp repo» — [`vdp/docs/pilot/known-gaps.md`](../../vdp/docs/pilot/known-gaps.md)
- **Master:** [vdp_reliability_master.plan.md](vdp_reliability_master.plan.md)

## Scope

**In:**

- GitHub Actions workflow для `vdp/**`
- Job split: unit (fast) vs compose-e2e (integration) vs Playwright (browser)
- Документация CI topology в `vdp/docs/operations/ci.md`
- Path filters, триггеры PR/main/nightly

**Out:**

- Dual-implement GitLab CI в MVP (только секция «mirror» в ci.md)
- Prod deploy / canary / secrets management
- Переписывание Makefile targets (использовать существующие)

## Rules gate

**Обязательны:**

- [`развертывание-и-доставка`](../.cursor/rules/развертывание-и-доставка.mdc) — CI по контексту vdp; один артефакт
- [`devops-культура`](../.cursor/rules/devops-культура.mdc) — feedback loop, не «купили Actions»
- [`тесты-архитектуры`](../.cursor/rules/тесты-архитектуры.mdc) — fast unit раньше тяжёлых E2E
- [`playwright-e2e`](../.cursor/rules/playwright-e2e.mdc) — Playwright в отдельном job
- [`правила-построения`](../.cursor/rules/правила-построения.mdc)
- [`честность-готовности`](../.cursor/rules/честность-готовности.mdc) — green CI ≠ prod go-live

**Вне scope:** nestjs-testing admin/test endpoints; полный security audit.

## Prerequisites

- [x] `make integration-gate` green локально
- [x] `make playwright-e2e` documented в [`vdp/fe/README.md`](../../vdp/fe/README.md)
- [x] Docker compose stack: [`vdp/docker-compose.yml`](../../vdp/docker-compose.yml)

## Работы

### 1. Workflow `.github/workflows/vdp-ci.yml`

**Job `fast`** (каждый PR, path `vdp/**`):

- Setup Node + Go
- `cd vdp/fe && npm ci && npm test`
- `cd vdp && make test`
- Timeout ~10 min

**Job `integration`** (push main, schedule nightly, label `integration` on PR):

- Docker available (GitHub `ubuntu-latest` + docker compose)
- `cd vdp && make compose-up`
- `cd vdp && ./scripts/compose-e2e.sh` (или `make compose-e2e` без повторного up)
- **Не** включать Playwright в этот job
- Timeout ~30 min

**Job `playwright`** (push main, workflow_dispatch, optional tag):

- Depends on `integration` success OR shared compose-up step
- `cd vdp && make playwright-e2e`
- **Отдельный failure domain** от integration
- Timeout ~25 min

**Job `docs`** (PR, path `vdp/docs/**`):

- `cd vdp && make docs-format-check` (если target существует; иначе создать stub в RH4 или пропустить с TODO)

**Path filters:**

```yaml
paths:
  - 'vdp/**'
  - '.github/workflows/vdp-ci.yml'
```

### 2. Документ `vdp/docs/operations/ci.md`

Содержание (формат h1–h3, p per DOC conventions):

- Topology diagram (jobs и зависимости)
- Когда блокируется PR vs main
- Локальные эквиваленты: `make test`, `make integration-gate`, `make playwright-e2e`
- GitLab mirror (описание, без реализации): `.gitlab-ci.yml` stages fast/integration/playwright
- Branch protection рекомендации: required check `fast`; `integration` on main

### 3. Обновить sketch

- [`vdp/docs/development/testing.md`](../../vdp/docs/development/testing.md) — ссылка на ci.md вместо inline sketch
- [`vdp/fe/README.md`](../../vdp/fe/README.md) — ссылка на ci.md

### 4. Known-gaps

Закрыть или обновить пункт «CI CD in vdp repo» — «GitHub Actions vdp-ci.yml; GitLab — manual mirror».

## Verify

```sh
# Локально перед merge workflow
cd vdp/fe && npm test
cd vdp && make test
cd vdp && make integration-gate
cd vdp && make playwright-e2e
```

После merge: GitHub Actions tab — all jobs green on main.

## DoD

- [ ] `.github/workflows/vdp-ci.yml` committed
- [ ] `fast` блокирует PR при падении unit
- [ ] `integration` и `playwright` — **разные jobs**, явно documented
- [ ] `vdp/docs/operations/ci.md` опубликован
- [ ] known-gaps CI пункт обновлён

## Honesty note

После RH0: **автоматическая регрессия на PR/main** — да. **Prod parity / real integrations** — нет (RH3/RH4). Stub docs/mail всё ещё в dev compose.

## GitLab mirror (doc only)

Stages: `fast` → `integration` → `playwright`. Services: docker:dind. Variables: `DATABASE_URL_*` для RH1 step.
