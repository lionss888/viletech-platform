#!/usr/bin/env bash
# Smoke tests for CD shell scripts (syntax + compose release config + pin contract).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "FAIL: $*" >&2; exit 1; }

for script in \
  scripts/ci-bootstrap-postgres.sh \
  scripts/image-build-push.sh \
  scripts/deploy-compose-release.sh \
  scripts/pin-revision.sh \
  scripts/wait-release-health.sh \
  scripts/rollback-compose-release.sh \
  scripts/bootstrap-host.sh \
  scripts/deploy-preview.sh \
  scripts/gitlab-promote.sh \
  scripts/compose-db-migrate.sh \
  scripts/db-migrate-host.sh \
  scripts/lib/e2e-continuity.sh \
  scripts/compose-e2e.sh \
  scripts/compose-playwright.sh \
  scripts/vdp-compose-up.sh \
  scripts/staging-smoke.sh \
  scripts/notify-mgmt.sh \
  scripts/ci-mgmt-notify.sh; do
  bash -n "$script"
  echo "syntax ok: $script"
done

echo "== host db-migrate uses glob (same set as compose-db-migrate) =="
grep -q 'db-migrate-host.sh' Makefile \
  || fail "make db-migrate must delegate to db-migrate-host.sh"
grep -q 'CORE_MIG' scripts/db-migrate-host.sh \
  || fail "db-migrate-host must use CORE_MIG"
grep -q 'HUB_MIG' scripts/db-migrate-host.sh \
  || fail "db-migrate-host must use HUB_MIG"
grep -qF '*.sql' scripts/db-migrate-host.sh \
  || fail "db-migrate-host must glob *.sql (not a hardcoded file list)"
grep -qF '*.sql' scripts/compose-db-migrate.sh \
  || fail "compose-db-migrate must glob *.sql"
# Contract: every numbered core SQL is covered by the host migrate script path (glob, not file list).
core_sql_count=$(find core/migrations -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')
hub_sql_count=$(find hub/migrations -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')
[ "$core_sql_count" -ge 17 ] || fail "expected >=17 core migrations, got $core_sql_count"
[ "$hub_sql_count" -ge 2 ] || fail "expected >=2 hub migrations, got $hub_sql_count"
awk '/^db-migrate:/{f=1;next} f&&/^[^#[:space:]].*:/{exit} f' Makefile | grep -qE '\.sql' \
  && fail "Makefile db-migrate recipe must not list individual .sql files"

echo "== compose-e2e sources continuity lib; no bare ECO auth_put =="
grep -q 'lib/e2e-continuity.sh' scripts/compose-e2e.sh \
  || fail "compose-e2e must source lib/e2e-continuity.sh"
grep -q 'advance_compliance' scripts/lib/e2e-continuity.sh \
  || fail "e2e-continuity must define advance_compliance"
# Bare ECO PUT outside try_/continuity helpers regresses pilot ICO/ECO-off.
if grep -nE 'auth_put[[:space:]]+"\$ECO_T"' scripts/compose-e2e.sh; then
  fail "compose-e2e must not call auth_put \"\$ECO_T\" (use try_put / continuity)"
fi
# Hard ECO path without try_ is only allowed in the continuity helper lib.
if grep -nE 'auth_put[[:space:]]+"\$ECO_T".*/eco/form-payment' scripts/compose-e2e.sh scripts/compose-playwright.sh 2>/dev/null; then
  fail "bare ECO form-payment auth_put outside try_ is forbidden"
fi

echo "== mgmt-notify-sanitize self-test =="
python3 scripts/mgmt-notify-sanitize.py --self-test

echo "== notify-mgmt dry-run strips brands =="
DRY="$(bash scripts/notify-mgmt.sh --dry-run --kind raw --body $'vitest OK\n.cursor/plans/foo.plan.md\nlocalhost:5173')"
echo "$DRY" | grep -qi vitest && fail "dry-run must strip vitest"
echo "$DRY" | grep -qi 'localhost' && fail "dry-run must strip localhost"
echo "$DRY" | grep -qi '\.cursor/' && fail "dry-run must strip .cursor paths"

echo "== notify-mgmt kinds push/review/pipeline =="
PUSH="$(bash scripts/notify-mgmt.sh --dry-run --kind push --title main --revision abc1234 --body 'Кратко: demo')"
echo "$PUSH" | grep -q 'Изменения' || fail "push kind missing header"
echo "$PUSH" | grep -q 'abc1234' || fail "push kind missing revision"
REV="$(bash scripts/notify-mgmt.sh --dry-run --kind review --status opened --title 'feat → main' --revision def5678)"
echo "$REV" | grep -q 'Запрос на слияние' || fail "review kind missing header"
echo "$REV" | grep -q 'открыт' || fail "review kind missing status"
PIPE="$(bash scripts/notify-mgmt.sh --dry-run --kind pipeline --status failed --title 'приёмка' --branch main --revision abc1234)"
echo "$PIPE" | grep -q 'Конвейер' || fail "pipeline kind missing header"
echo "$PIPE" | grep -q 'не пройден' || fail "pipeline kind missing fail status"
echo "$PIPE" | grep -qi playwright && fail "pipeline text must not name runners"

echo "== ci-mgmt-notify dry-run =="
CI_OUT="$(MGMT_CI_EVENT=push MGMT_CI_BRANCH=main MGMT_CI_REVISION=abc1234deadbeef MGMT_CI_SUBJECT='demo subject' \
  bash scripts/ci-mgmt-notify.sh dry-run)"
echo "$CI_OUT" | grep -q 'kind=push' || fail "ci helper must plan push on main"
CI_FAIL="$(MGMT_CI_EVENT=push MGMT_CI_BRANCH=main MGMT_CI_REVISION=abc1234 \
  MGMT_CI_FAILED_STEPS=fast,playwright bash scripts/ci-mgmt-notify.sh dry-run)"
echo "$CI_FAIL" | grep -q 'kind=pipeline' || fail "ci helper must plan pipeline on failure"
echo "$CI_FAIL" | grep -q 'приёмка' || fail "ci helper must map fast→приёмка"
echo "$CI_FAIL" | grep -q 'сценарии' || fail "ci helper must map playwright→сценарии"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

write_pin() {
  cat >"$1"
}

# The pin is the deploy contract: promote resolves both the digests and the
# revision of compose/scripts from it.
echo "== pin-revision: valid pin =="
write_pin "$TMP/full.env" <<'EOF'
IMAGE_TAG=sha-abc1234
GIT_REVISION=abc1234def5678901234567890abcdef12345678
VDP_CORE_IMAGE=ghcr.io/acme/vdp-core@sha256:aaa
EOF
actual_revision=$(bash scripts/pin-revision.sh "$TMP/full.env")
expected_revision=abc1234def5678901234567890abcdef12345678
[ "$actual_revision" = "$expected_revision" ] || fail "pin-revision returned '$actual_revision'"

echo "== pin-revision: missing GIT_REVISION rejected =="
write_pin "$TMP/no-rev.env" <<'EOF'
IMAGE_TAG=sha-abc1234
VDP_CORE_IMAGE=ghcr.io/acme/vdp-core@sha256:aaa
EOF
if bash scripts/pin-revision.sh "$TMP/no-rev.env" >/dev/null 2>&1; then
  fail "pin without GIT_REVISION must not resolve a revision"
fi

echo "== pin-revision: unknown GIT_REVISION rejected =="
write_pin "$TMP/unknown-rev.env" <<'EOF'
GIT_REVISION=unknown
VDP_CORE_IMAGE=ghcr.io/acme/vdp-core@sha256:aaa
EOF
if bash scripts/pin-revision.sh "$TMP/unknown-rev.env" >/dev/null 2>&1; then
  fail "GIT_REVISION=unknown must not resolve a revision"
fi

echo "== pin-revision: missing pin file rejected =="
if bash scripts/pin-revision.sh "$TMP/absent.env" >/dev/null 2>&1; then
  fail "missing pin file must fail"
fi

echo "== image-build-push includes extraction pin =="
grep -q 'VDP_EXTRACTION_IMAGE=' scripts/image-build-push.sh \
  || fail "image-build-push.sh must pin VDP_EXTRACTION_IMAGE"
grep -q 'extraction/Dockerfile' scripts/image-build-push.sh \
  || fail "image-build-push.sh must build extraction image"
grep -q 'VDP_EXTRACTION_IMAGE' docker-compose.release.yml \
  || fail "release overlay must set extraction image from pin"
grep -q 'VDP_EXTRACTION_IMAGE' scripts/deploy-compose-release.sh \
  || fail "deploy must require and pull VDP_EXTRACTION_IMAGE"

echo "== deploy refuses an incomplete pin before touching the host =="
write_pin "$TMP/partial.env" <<'EOF'
IMAGE_TAG=sha-abc1234
GIT_REVISION=abc1234def5678901234567890abcdef12345678
VDP_HUB_IMAGE=ghcr.io/acme/vdp-hub@sha256:bbb
EOF
deploy_output="$TMP/deploy.log"
if DEPLOY_HOST=deploy.invalid PIN_FILE="$TMP/partial.env" \
  bash scripts/deploy-compose-release.sh >"$deploy_output" 2>&1; then
  fail "deploy must reject a pin without VDP_CORE_IMAGE"
fi
grep -q 'VDP_CORE_IMAGE' "$deploy_output" \
  || fail "deploy failed for the wrong reason: $(cat "$deploy_output")"

echo "== deploy rejects a missing pin file =="
if DEPLOY_HOST=deploy.invalid PIN_FILE="$TMP/absent.env" \
  bash scripts/deploy-compose-release.sh >/dev/null 2>&1; then
  fail "deploy must reject a missing pin file"
fi

# One path: UI changes leave lionss888/vdp, land in this repo via PR into vdp/fe,
# then Images builds the whole product and Deploy promotes digests to the VM
# without rebuilding on the host.
echo "== path: lionss888/vdp → viletech-platform → server build =="
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
WF_SYNC="$REPO_ROOT/.github/workflows/vdp-lovable-sync.yml"
WF_IMAGES="$REPO_ROOT/.github/workflows/vdp-images.yml"
WF_DEPLOY="$REPO_ROOT/.github/workflows/vdp-deploy.yml"
[ -f "$WF_SYNC" ] || fail "missing $WF_SYNC"
[ -f "$WF_IMAGES" ] || fail "missing $WF_IMAGES"
[ -f "$WF_DEPLOY" ] || fail "missing $WF_DEPLOY"
grep -q "lionss888/vdp" "$WF_SYNC" \
  || fail "lovable sync must default to github.com/lionss888/vdp"
grep -q 'vdp/fe/' "$WF_SYNC" \
  || fail "lovable sync must copy UI into vdp/fe"
grep -q 'gh pr create' "$WF_SYNC" \
  || fail "lovable sync must open a PR into viletech-platform (not push straight to main)"
grep -q -- '--base main' "$WF_SYNC" \
  || fail "lovable sync PR must target main"
grep -q 'image-build-push.sh' "$WF_IMAGES" \
  || fail "vdp-images must build the project via image-build-push.sh"
grep -q 'workflow_run' "$WF_DEPLOY" \
  || fail "vdp-deploy must auto-run after Images (server promote)"
grep -q -- '--no-build' scripts/deploy-compose-release.sh \
  || fail "server promote must pull digests without docker build on the host"
grep -q 'compose pull\|docker compose .* pull' scripts/deploy-compose-release.sh \
  || grep -q 'vdp-compose-up.sh' scripts/deploy-compose-release.sh \
  || fail "server promote must pull/up release images on the host"

echo "== promote always applies SQL migrations (existing volumes skip initdb) =="
grep -q 'compose-db-migrate' scripts/vdp-compose-up.sh \
  || fail "vdp-compose-up must run compose-db-migrate"
grep -q 'compose-db-migrate' scripts/deploy-compose-release.sh \
  || fail "deploy-compose-release must invoke compose-db-migrate (via up or fallback)"
grep -q 'compose-db-migrate' scripts/rollback-compose-release.sh \
  || fail "rollback must run compose-db-migrate"
grep -q 'compose-db-migrate' scripts/deploy-preview.sh \
  || fail "preview deploy must run compose-db-migrate"
grep -q 'COMPOSE_FILES' scripts/compose-db-migrate.sh \
  || fail "compose-db-migrate must honor COMPOSE_FILES for release/preview"

echo "== local make compose-up: postgres → migrate → stack (core seed needs schema) =="
awk '/^compose-up:/{f=1;next} f&&/^[^#[:space:]].*:/{exit} f' Makefile > /tmp/vdp-compose-up-recipe.txt
pg_line=$(grep -n 'postgres-core postgres-hub' /tmp/vdp-compose-up-recipe.txt | head -1 | cut -d: -f1)
mig_line=$(grep -n 'compose-db-migrate' /tmp/vdp-compose-up-recipe.txt | head -1 | cut -d: -f1)
stack_line=$(grep -n 'docker compose up -d --build$' /tmp/vdp-compose-up-recipe.txt | head -1 | cut -d: -f1)
[ -n "$pg_line" ] || fail "compose-up must start postgres-core postgres-hub first"
[ -n "$mig_line" ] || fail "compose-up must run compose-db-migrate"
[ -n "$stack_line" ] || fail "compose-up must bring full stack after migrate"
[ "$pg_line" -lt "$mig_line" ] && [ "$mig_line" -lt "$stack_line" ] \
  || fail "compose-up order must be postgres → compose-db-migrate → full stack"

echo "== staging-smoke must exercise seed login (schema drift → 401) =="
grep -q '/api/v1/auth/login' scripts/staging-smoke.sh \
  || fail "staging-smoke must POST /api/v1/auth/login"
grep -q 'user@vdp.local' scripts/staging-smoke.sh \
  || fail "staging-smoke must use seed user@vdp.local"

make compose-release-config-check

echo "== VDP CI / Images seam contract (ci.md) =="
CI_YML="../.github/workflows/vdp-ci.yml"
IMG_YML="../.github/workflows/vdp-images.yml"
[ -f "$CI_YML" ] || fail "missing $CI_YML"
[ -f "$IMG_YML" ] || fail "missing $IMG_YML"
# Integration must run on every PR (no label-only gate).
if grep -n "pull_request.labels" "$CI_YML" | grep -q integration; then
  fail "vdp-ci integration must not be gated on PR label integration"
fi
grep -q 'name: integration (postgres + compose-e2e)' "$CI_YML" \
  || fail "vdp-ci must keep integration job name for branch protection"
grep -q 'GATEWAY_RATE_LIMIT' "$CI_YML" \
  || fail "vdp-ci must set GATEWAY_RATE_LIMIT for long suites"
grep -q 'e2e/login-form.spec.ts e2e/user-submit.spec.ts e2e/provider-acl.spec.ts e2e/reject-path.spec.ts' "$CI_YML" \
  || fail "vdp-ci PR PLAYWRIGHT_ARGS must match documented narrow set"
grep -q 'wait-vdp-ci\|wait VDP CI' "$IMG_YML" \
  || fail "vdp-images must wait for VDP CI on main push"
grep -q 'needs.wait-vdp-ci' "$IMG_YML" \
  || fail "vdp-images build-push must depend on wait-vdp-ci"
# Docs mention required checks + Images←CI.
grep -q 'integration (postgres + compose-e2e)' docs/operations/ci.md \
  || fail "ci.md must list integration as required check"
grep -q 'ждёт успешный VDP CI\|wait VDP CI\|ждёт green VDP CI' docs/operations/ci.md \
  || fail "ci.md must document Images waits for VDP CI on main"
grep -q 'provider-acl' docs/operations/ci.md \
  || fail "ci.md must document PR PLAYWRIGHT_ARGS set"

echo "== FE scenario IDs ⊆ Go catalog constants =="
python3 - <<'PY'
import pathlib, re, sys
fe = pathlib.Path("fe/src/lib/ved/scenario-catalog.ts").read_text()
go = pathlib.Path("core/internal/scenarioverify/catalog.go").read_text()
fe_ids = set(re.findall(r'"([a-z0-9_]+)"', fe.split("UI_SCENARIO_SPECS")[0]))
# drop non-id noise from type exports if any
fe_ids = {i for i in fe_ids if "_" in i or i.startswith("health")}
go_ids = set(re.findall(r'=\s*"([a-z0-9_]+)"', go))
missing = sorted(fe_ids - go_ids)
if missing:
    print("FE SCENARIO_IDS missing in Go catalog:", missing, file=sys.stderr)
    sys.exit(1)
print(f"catalog sync ok: {len(fe_ids)} FE ids ⊆ Go")
PY

echo "test-cd-scripts passed"
