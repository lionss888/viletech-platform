#!/usr/bin/env bash
# RD11: Playwright E2E against compose stack via official Linux image (browsers preinstalled).
# Host stack must be up: cd vdp && make compose-up
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_NETWORK="${COMPOSE_NETWORK:-vdp_default}"
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.62.1-jammy}"
# In-container URLs on compose network (ignore host CORE_URL / PLAYWRIGHT_BASE_URL from Makefile).
E2E_FE_URL="${E2E_FE_URL:-http://fe:5173}"
E2E_CORE_URL="${E2E_CORE_URL:-http://core:8080}"

echo "== health (compose network ${COMPOSE_NETWORK}) =="
docker run --rm --network "${COMPOSE_NETWORK}" curlimages/curl:latest \
  -sf "${E2E_CORE_URL}/api/v1/health" >/dev/null || {
  echo "FAIL: core not reachable at ${E2E_CORE_URL} on ${COMPOSE_NETWORK} — run: cd vdp && make compose-up" >&2
  exit 1
}
docker run --rm --network "${COMPOSE_NETWORK}" curlimages/curl:latest \
  -sf "${E2E_FE_URL}/login" >/dev/null || {
  echo "FAIL: fe not reachable at ${E2E_FE_URL} (check vite allowedHosts includes fe)" >&2
  exit 1
}

echo "== playwright (docker ${PLAYWRIGHT_IMAGE}) =="
# Copy fe sources into an ephemeral container workdir. Never write node_modules onto the
# compose bind mount ./fe — that races the fe service named volume and clears Vite deps
# (browser then gets 404 on /node_modules/.vite/deps/* and login never hydrates).
PLAYWRIGHT_ARGS="${PLAYWRIGHT_ARGS:-}"
VDP_ROBOT_FIXTURE_PACK="${VDP_ROBOT_FIXTURE_PACK:-template}"
docker run --rm \
  --network "${COMPOSE_NETWORK}" \
  -v "${ROOT}/fe:/fe:ro" \
  -v "${ROOT}/testdata:/testdata:ro" \
  -w /work \
  -e PLAYWRIGHT_BASE_URL="${E2E_FE_URL}" \
  -e CORE_URL="${E2E_CORE_URL}" \
  -e CI="${CI:-}" \
  -e PLAYWRIGHT_ARGS="${PLAYWRIGHT_ARGS}" \
  -e VDP_ROBOT_FIXTURE_PACK="${VDP_ROBOT_FIXTURE_PACK}" \
  -e VDP_ROBOT_FIXTURES_ROOT="/testdata/robot-fixtures" \
  "${PLAYWRIGHT_IMAGE}" \
  bash -lc '
set -euo pipefail
echo "node=$(node -v) npm=$(npm -v) CI=${CI:-}"
mkdir -p /work
# Exclude host/container node_modules and Vite caches from the copy.
tar -C /fe --exclude=node_modules --exclude=playwright-report --exclude=test-results \
  -cf - . | tar -C /work -xf -
cd /work
echo "running: npm ci --ignore-scripts"
npm ci --ignore-scripts
# Split PLAYWRIGHT_ARGS on whitespace into argv (empty = full suite).
# shellcheck disable=SC2086
set -- ${PLAYWRIGHT_ARGS:-}
echo "running: npx playwright test $*"
npx playwright test "$@"
'

echo "playwright e2e green"
