#!/usr/bin/env bash
# OCR product path before human UAT: Docling smoke + wizard journey (pending must end).
# Requires compose stack up (make compose-up). Does not run @pilot-matrix.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_NETWORK="${COMPOSE_NETWORK:-vdp_default}"
E2E_CORE_URL="${E2E_CORE_URL:-http://core:8080}"
E2E_FE_URL="${E2E_FE_URL:-http://fe:5173}"

echo "== ocr-path-gate: compose health =="
if ! docker network inspect "${COMPOSE_NETWORK}" >/dev/null 2>&1; then
  echo "FAIL: docker network ${COMPOSE_NETWORK} missing — run: cd vdp && make compose-up" >&2
  exit 1
fi
docker run --rm --network "${COMPOSE_NETWORK}" curlimages/curl:latest \
  -sf "${E2E_CORE_URL}/api/v1/health" >/dev/null || {
  echo "FAIL: core not reachable — run: cd vdp && make compose-up" >&2
  exit 1
}
docker run --rm --network "${COMPOSE_NETWORK}" curlimages/curl:latest \
  -sf "${E2E_FE_URL}/login" >/dev/null || {
  echo "FAIL: fe not reachable — run: cd vdp && make compose-up" >&2
  exit 1
}

echo "== ocr-path-gate: extraction-docling-smoke =="
chmod +x scripts/extraction-docling-smoke.sh
./scripts/extraction-docling-smoke.sh

echo "== ocr-path-gate: playwright ocr-wizard-path =="
PLAYWRIGHT_ARGS='e2e/ocr-wizard-path.spec.ts' "${MAKE:-make}" playwright-e2e

echo "ocr-path-gate green"
