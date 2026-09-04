#!/usr/bin/env bash
# Smoke tests for CD shell scripts (syntax + compose release config + pin contract).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for script in \
  scripts/ci-bootstrap-postgres.sh \
  scripts/image-build-push.sh \
  scripts/deploy-compose-release.sh \
  scripts/pin-revision.sh \
  scripts/wait-release-health.sh \
  scripts/rollback-compose-release.sh \
  scripts/bootstrap-host.sh \
  scripts/deploy-preview.sh \
  scripts/gitlab-promote.sh; do
  bash -n "$script"
  echo "syntax ok: $script"
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

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

echo "== image-build-push writes GIT_REVISION into the pin =="
grep -q '^GIT_REVISION=\${GIT_REVISION}$' scripts/image-build-push.sh \
  || fail "image-build-push.sh must pin GIT_REVISION (deploy resolves the tree from it)"

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

make compose-release-config-check
echo "test-cd-scripts passed"
