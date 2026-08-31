#!/usr/bin/env bash
# Wait for release stack health (core, hub, fe-prod on port 3000).
set -euo pipefail

CORE_URL="${CORE_URL:-http://127.0.0.1:8080}"
HUB_URL="${HUB_URL:-http://127.0.0.1:8081}"
FE_URL="${FE_URL:-http://127.0.0.1:3000}"
TIMEOUT_SEC="${TIMEOUT_SEC:-120}"

deadline=$((SECONDS + TIMEOUT_SEC))
while [ "$SECONDS" -lt "$deadline" ]; do
  if curl -sf "${CORE_URL}/api/v1/health" >/dev/null \
    && curl -sf "${HUB_URL}/api/v1/health" >/dev/null \
    && curl -sf "${FE_URL}/login" >/dev/null; then
    echo "release health ok"
    exit 0
  fi
  sleep 2
done

echo "release health timeout after ${TIMEOUT_SEC}s" >&2
exit 1
