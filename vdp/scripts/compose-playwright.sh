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
# CI: always reinstall linux node_modules. Host darwin node_modules break the Linux image.
# PLAYWRIGHT_ARGS limits the required journey (login + User top-task) on the main gate.
PLAYWRIGHT_ARGS="${PLAYWRIGHT_ARGS:-}"
docker run --rm \
  --network "${COMPOSE_NETWORK}" \
  -v "${ROOT}/fe:/app" \
  -w /app \
  -e PLAYWRIGHT_BASE_URL="${E2E_FE_URL}" \
  -e CORE_URL="${E2E_CORE_URL}" \
  -e CI="${CI:-}" \
  -e PLAYWRIGHT_ARGS="${PLAYWRIGHT_ARGS}" \
  "${PLAYWRIGHT_IMAGE}" \
  bash -lc 'if [ "${CI}" = "true" ] || [ ! -d node_modules/@playwright/test ]; then npm ci --ignore-scripts; fi && npx playwright test ${PLAYWRIGHT_ARGS}'

echo "playwright e2e green"
