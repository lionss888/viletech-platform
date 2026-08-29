#!/usr/bin/env bash
# RD11: Playwright E2E against compose stack via official Linux image (browsers preinstalled).
# Host stack must be up: cd vdp && make compose-up
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE_HOST="${FE_HOST:-127.0.0.1}"
CORE_HOST="${CORE_HOST:-127.0.0.1}"
FE_PORT="${FE_PORT:-5173}"
CORE_PORT="${CORE_PORT:-8080}"
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.62.1-jammy}"

PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://${FE_HOST}:${FE_PORT}}"
CORE_URL="${CORE_URL:-http://${CORE_HOST}:${CORE_PORT}}"

echo "== health (host) =="
curl -sf "${CORE_URL}/api/v1/health" >/dev/null || {
  echo "FAIL: core not reachable at ${CORE_URL} — run: cd vdp && make compose-up" >&2
  exit 1
}
curl -sf "${PLAYWRIGHT_BASE_URL}/login" >/dev/null || {
  echo "FAIL: fe not reachable at ${PLAYWRIGHT_BASE_URL}" >&2
  exit 1
}

# Inside the container, reach host services via host.docker.internal (Linux: host-gateway).
CONTAINER_FE_URL="http://host.docker.internal:${FE_PORT}"
CONTAINER_CORE_URL="http://host.docker.internal:${CORE_PORT}"

echo "== playwright (docker ${PLAYWRIGHT_IMAGE}) =="
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "${ROOT}/fe:/app" \
  -w /app \
  -e PLAYWRIGHT_BASE_URL="${CONTAINER_FE_URL}" \
  -e CORE_URL="${CONTAINER_CORE_URL}" \
  -e CI=1 \
  "${PLAYWRIGHT_IMAGE}" \
  bash -lc 'npm ci --ignore-scripts && npx playwright test'

echo "playwright e2e green"
