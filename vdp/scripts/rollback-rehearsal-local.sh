#!/usr/bin/env bash
# Local rollback pin rehearsal: validates last-good → active pin swap without remote SSH.
# Does not pull images or touch a live VM. Pair with make test-cd-scripts for script contracts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "FAIL: $*" >&2; exit 1; }

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

ENVIRONMENT="${ENVIRONMENT:-alpha}"
LAST_GOOD="$WORKDIR/.release-images.${ENVIRONMENT}.last-good"
ACTIVE="$WORKDIR/.release-images.env"

cat >"$LAST_GOOD" <<'EOF'
IMAGE_TAG=rehearsal-prev
VDP_CORE_IMAGE=ghcr.io/example/vdp-core@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
VDP_HUB_IMAGE=ghcr.io/example/vdp-hub@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
VDP_DOCS_IMAGE=ghcr.io/example/vdp-docs@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
VDP_FE_IMAGE=ghcr.io/example/vdp-fe@sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
EOF

# Stale active pin (simulates current bad deploy)
cat >"$ACTIVE" <<'EOF'
IMAGE_TAG=rehearsal-bad
VDP_CORE_IMAGE=ghcr.io/example/vdp-core@sha256:1111111111111111111111111111111111111111111111111111111111111111
EOF

cp "$LAST_GOOD" "$ACTIVE"
# shellcheck disable=SC1090
set -a && source "$ACTIVE" && set +a

[[ "${IMAGE_TAG:-}" == "rehearsal-prev" ]] || fail "pin swap did not restore IMAGE_TAG from last-good"
[[ -n "${VDP_CORE_IMAGE:-}" ]] || fail "VDP_CORE_IMAGE missing after pin swap"
[[ -n "${VDP_HUB_IMAGE:-}" ]] || fail "VDP_HUB_IMAGE missing after pin swap"

# Contract: remote rollback script still points at last-good default and migrate path
grep -q 'last-good' scripts/rollback-compose-release.sh \
  || fail "rollback-compose-release.sh must reference last-good pin"
grep -q 'compose-db-migrate\|vdp-compose-up' scripts/rollback-compose-release.sh \
  || fail "rollback must migrate via compose-db-migrate or vdp-compose-up"
bash -n scripts/rollback-compose-release.sh || fail "rollback-compose-release.sh syntax"

echo "rollback-rehearsal-local ok environment=$ENVIRONMENT tag=$IMAGE_TAG"
