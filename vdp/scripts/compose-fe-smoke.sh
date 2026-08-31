#!/usr/bin/env bash
# Smoke: fe dev page render + API proxy (POST /auth/login via Vite proxy).
# Browser form login is covered by Playwright login-form.spec.ts (make playwright-e2e).
set -euo pipefail

FE_URL="${FE_URL:-http://127.0.0.1:5173}"
CORE_URL="${CORE_URL:-http://127.0.0.1:8080}"

echo "== fe page =="
HTML=$(curl -sf "$FE_URL/login")
echo "$HTML" | grep -qi "Вход" || {
  echo "FAIL: /login page missing expected content" >&2
  exit 1
}
echo "fe /login page render ok"

echo "== fe api proxy (user) =="
USER_JSON=$(curl -sf -X POST "$FE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@vdp.local","password":"user"}')
echo "$USER_JSON" | grep -q token
USER_TOKEN=$(echo "$USER_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo "fe /api proxy ok (core at $CORE_URL)"

echo "== core forms list =="
curl -sf -H "Authorization: Bearer $USER_TOKEN" "$FE_URL/api/v1/forms" | grep -q '\['
echo "forms list ok"

echo "== bank login + create =="
BANK_ORG_ID="${BANK_ORG_ID:-88888888-8888-8888-8888-888888888888}"
BANK_JSON=$(curl -sf -X POST "$FE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"bank@vdp.local","password":"bank"}')
echo "$BANK_JSON" | grep -q token || {
  echo "FAIL: bank login" >&2
  exit 1
}
BANK_TOKEN=$(echo "$BANK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
curl -sf -X POST "$FE_URL/api/v1/bank/forms" \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: smoke-$(date +%s)" \
  -d "{\"organization_id\":\"$BANK_ORG_ID\",\"invoice_amount\":\"100\",\"currency\":\"USD\",\"contract_number\":\"SMOKE-1\",\"contract_date\":\"2026-08-01\",\"correlation_id\":\"smoke-corr\"}" \
  | grep -q '"channel"'
echo "bank form create ok"

echo "fe smoke green"
