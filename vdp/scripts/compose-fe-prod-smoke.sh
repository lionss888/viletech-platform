#!/usr/bin/env bash
# Smoke: fe-prod (nitro node-server) serves /login and proxies /api to core.
set -euo pipefail

FE_URL="${FE_URL:-http://127.0.0.1:3000}"

echo "== fe-prod page =="
HTML=$(curl -sf "$FE_URL/login")
echo "$HTML" | grep -qi "Вход" || {
  echo "FAIL: /login page missing expected content" >&2
  exit 1
}
echo "fe-prod /login ok"

echo "== fe-prod api proxy =="
curl -sf -X POST "$FE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@vdp.local","password":"user"}' | grep -q token
echo "fe-prod /api proxy ok"

echo "fe-prod smoke green"
