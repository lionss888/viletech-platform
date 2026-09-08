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
  scripts/compose-playwright.sh \
  scripts/db-migrate-host.sh \
  scripts/lib/e2e-continuity.sh \
  scripts/compose-e2e.sh \
  scripts/wait-vdp-ci.sh \
  scripts/vdp-compose-up.sh \
  scripts/staging-smoke.sh \
  scripts/notify-mgmt.sh \
  scripts/ci-mgmt-notify.sh \
  scripts/precommit-mgmt-notify.sh; do
  [ -f "$script" ] || fail "missing $script"
  bash -n "$script"
  echo "syntax ok: $script"
done

echo "== mgmt-notify-sanitize self-test =="
python3 scripts/mgmt-notify-sanitize.py --self-test

echo "== notify-mgmt dry-run strips brands =="
DRY="$(bash scripts/notify-mgmt.sh --dry-run --kind raw --body $'vitest OK\n.cursor/plans/foo.plan.md\nlocalhost:5173')"
echo "$DRY" | grep -qi vitest && fail "dry-run must strip vitest"
echo "$DRY" | grep -qi 'localhost' && fail "dry-run must strip localhost"
echo "$DRY" | grep -qi '\.cursor/' && fail "dry-run must strip .cursor paths"

echo "== ci-mgmt-notify gate-summary pass =="
GATE_PASS="$(
  NEED_fast_RESULT=success NEED_docs_RESULT=success \
  NEED_integration_RESULT=success NEED_playwright_RESULT=success \
  MGMT_CI_REVISION=abc1234deadbeef MGMT_CI_BRANCH=main \
  bash scripts/ci-mgmt-notify.sh dry-run gate-summary 2>&1
)"
echo "$GATE_PASS" | grep -qi 'kind=gate' || fail "gate-summary pass should dry-run kind=gate"
echo "$GATE_PASS" | grep -qi vitest && fail "gate-summary must not mention vitest"
echo "$GATE_PASS" | grep -qi playwright && fail "gate-summary must not mention playwright"

echo "== ci-mgmt-notify gate-summary fail labels =="
GATE_FAIL="$(
  NEED_fast_RESULT=failure NEED_docs_RESULT=success \
  NEED_integration_RESULT=success NEED_playwright_RESULT=success \
  MGMT_CI_REVISION=abc1234deadbeef MGMT_CI_BRANCH=main \
  bash scripts/ci-mgmt-notify.sh dry-run gate-summary 2>&1
)"
echo "$GATE_FAIL" | grep -qi 'kind=pipeline' || fail "failed gate-summary dry-run should emit kind=pipeline"
echo "$GATE_FAIL" | grep -qi playwright && fail "fail summary must not say playwright"

echo "== ci-mgmt-notify deploy-ok / deploy-fail dry-run =="
DEPLOY_OK="$(
  MGMT_CI_ENV=alpha MGMT_CI_REVISION=abc1234deadbeef \
  MGMT_CI_BODY='дымовые на среде: ок' \
  bash scripts/ci-mgmt-notify.sh dry-run deploy-ok 2>&1
)"
echo "$DEPLOY_OK" | grep -qi 'kind=promote' || fail "deploy-ok should dry-run kind=promote"
echo "$DEPLOY_OK" | grep -qiE 'localhost|vitest|playwright|github' && fail "deploy-ok banned token"

DEPLOY_FAIL="$(
  MGMT_CI_ENV=alpha MGMT_CI_REVISION=abc1234deadbeef \
  bash scripts/ci-mgmt-notify.sh dry-run deploy-fail 2>&1
)"
echo "$DEPLOY_FAIL" | grep -qi 'kind=promote' || fail "deploy-fail should dry-run kind=promote"
echo "$DEPLOY_FAIL" | grep -qi 'kind=pipeline' || fail "deploy-fail should also dry-run kind=pipeline"

echo "== ci-mgmt-notify pre-images-gate dry-run =="
PRE_IMG="$(
  MGMT_CI_REVISION=abc1234deadbeef MGMT_CI_BRANCH=main MGMT_CI_GATE_STATUS=passed \
  bash scripts/ci-mgmt-notify.sh dry-run pre-images-gate 2>&1
)"
echo "$PRE_IMG" | grep -qi 'kind=gate' || fail "pre-images-gate passed should dry-run kind=gate"

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

echo "== host db-migrate matches compose migration file set =="
grep -q 'db-migrate-host.sh' Makefile \
  || fail "Makefile db-migrate must delegate to db-migrate-host.sh"
grep -qE 'CORE_MIG.*\*\.sql|"\$CORE_MIG"/\*\.sql|migrations/\*\.sql' scripts/db-migrate-host.sh \
  || fail "db-migrate-host must glob migrations/*.sql"
grep -qE 'migrations/\*\.sql|\*\.sql' scripts/compose-db-migrate.sh \
  || fail "compose-db-migrate must glob migrations/*.sql"
grep -q 'for f in' scripts/db-migrate-host.sh \
  || fail "db-migrate-host must iterate migration files"
grep -q 'for f in\|for file in\|/\*\.sql' scripts/compose-db-migrate.sh \
  || fail "compose-db-migrate must iterate migration files"
for mig in core/migrations/*.sql; do
  base="$(basename "$mig")"
  [[ "$base" =~ ^[0-9]{3}_ ]] || fail "unexpected migration name: $base"
done
# Contract: every NNN_*.sql is applied by the same glob both paths use (no hand list).
host_count=$(find core/migrations -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')
[ "$host_count" -ge 17 ] || fail "expected >=17 core migrations, got $host_count"

echo "== compose-e2e sources continuity lib; no bare ECO auth_put =="
grep -q 'lib/e2e-continuity.sh' scripts/compose-e2e.sh \
  || fail "compose-e2e must source e2e-continuity.sh"
grep -q 'advance_compliance' scripts/lib/e2e-continuity.sh \
  || fail "e2e-continuity must define advance_compliance"
if grep -nE 'auth_put[[:space:]]+"\$ECO_T"' scripts/compose-e2e.sh; then
  fail "compose-e2e must not call auth_put \"\$ECO_T\" (use try_/continuity lib)"
fi
# Hard ECO role route without try_ in compose-e2e (allow comments / strings in continuity via lib only).
if grep -nE '[^_](/api/v1/eco/form-payment/)' scripts/compose-e2e.sh | grep -vE 'try_(put|post)|#'; then
  fail "compose-e2e must not hard-call /eco/form-payment without try_ (use e2e-continuity.sh)"
fi

echo "== VDP CI: integration on every PR; Images waits CI on main =="
WF_CI="$REPO_ROOT/.github/workflows/vdp-ci.yml"
[ -f "$WF_CI" ] || fail "missing $WF_CI"
# integration must not be gated by PR label only
if grep -nE "pull_request\.labels\.\*\.name,\s*'integration'|labels\.\*\.name, 'integration'" "$WF_CI"; then
  fail "integration must run on every PR (no label-only gate)"
fi
grep -q 'GATEWAY_RATE_LIMIT' "$WF_CI" \
  || fail "vdp-ci must set GATEWAY_RATE_LIMIT for long E2E suites"
# PR Playwright stays narrow; full suite when PLAYWRIGHT_ARGS empty (non-PR)
grep -q 'e2e/login-form.spec.ts' "$WF_CI" \
  || fail "vdp-ci PR PLAYWRIGHT_ARGS must include login-form"
grep -q 'e2e/reject-path.spec.ts' "$WF_CI" \
  || fail "vdp-ci PR PLAYWRIGHT_ARGS must include reject-path"
# Images on main must wait for VDP CI via wait-vdp-ci / wait-for-ci job
grep -q 'wait-vdp-ci.sh' "$WF_IMAGES" \
  || fail "vdp-images must invoke wait-vdp-ci.sh on main"
grep -q 'wait-for-ci\|wait for VDP CI' "$WF_IMAGES" \
  || fail "vdp-images must define wait-for-ci job for main push"
grep -q 'needs.wait-for-ci.result' "$WF_IMAGES" \
  || fail "build-push must depend on wait-for-ci success|skipped"
grep -q 'pre-images-gate' "$WF_IMAGES" \
  || fail "vdp-images must notify pre-images-gate after wait-for-ci"
grep -q 'ci-mgmt-notify.sh' "$WF_IMAGES" \
  || fail "vdp-images wait-for-ci sparse-checkout must include ci-mgmt-notify.sh"
grep -q 'mgmt-notify-sanitize.py' "$WF_IMAGES" \
  || fail "vdp-images wait-for-ci sparse-checkout must include mgmt-notify-sanitize.py"
grep -q 'continue-on-error: true' "$WF_IMAGES" \
  || fail "vdp-images pre-images notify must continue-on-error (must not block digests)"
grep -q 'steps.await-ci.outcome' "$WF_IMAGES" \
  || fail "vdp-images failed notify must key off await-ci outcome"
WF_DEPLOY="$REPO_ROOT/.github/workflows/vdp-deploy.yml"
[ -f "$WF_DEPLOY" ] || fail "missing $WF_DEPLOY"
grep -q 'deploy-fail' "$WF_DEPLOY" \
  || fail "vdp-deploy must notify deploy-fail on failure"
grep -q 'notify_deploy\|дымовые на среде' scripts/deploy-compose-release.sh \
  || fail "deploy-compose-release must notify promote after smoke"

# docs/operations/ci.md must describe required checks (contract for ops)
CI_DOC="$ROOT/docs/operations/ci.md"
[ -f "$CI_DOC" ] || fail "missing $CI_DOC"
grep -q 'integration (postgres + compose-e2e)' "$CI_DOC" \
  || fail "ci.md must list integration as required check"
grep -q 'wait for VDP CI\|wait-vdp-ci\|wait-for-ci' "$CI_DOC" \
  || fail "ci.md must document Images waiting for VDP CI on main"
grep -q 'PLAYWRIGHT_ARGS' "$CI_DOC" \
  || fail "ci.md must document PLAYWRIGHT_ARGS PR vs main"

echo "== Pilot Robot Matrix contract =="
[ -f scripts/robot-matrix-check.sh ] || fail "missing scripts/robot-matrix-check.sh"
[ -f scripts/robot-fixtures-import.sh ] || fail "missing scripts/robot-fixtures-import.sh"
[ -f testdata/robot-fixtures/manifest.json ] || fail "missing robot-fixtures manifest"
grep -q 'playwright-pilot-matrix' Makefile || fail "Makefile missing playwright-pilot-matrix"
grep -q 'robot-matrix-check' Makefile || fail "Makefile missing robot-matrix-check"
grep -q '^ci-pr:' Makefile || fail "Makefile missing ci-pr target"
grep -q '^ci-pr-fast:' Makefile || fail "Makefile missing ci-pr-fast target"
grep -q 'VDP_ROBOT_FIXTURES_ROOT' scripts/compose-playwright.sh \
  || fail "compose-playwright must mount robot fixtures root"
./scripts/robot-matrix-check.sh

make compose-release-config-check
echo "test-cd-scripts passed"
