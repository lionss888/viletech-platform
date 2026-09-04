#!/usr/bin/env bash
# Staging smoke: core/hub health + optional DOCS_URL / MAIL_URL / bank webhook reachability.
# Run against staging after exporting vars from docs/operations/staging-env.example.
set -euo pipefail

BASE="${CORE_URL:-http://127.0.0.1:8080}"
HUB="${HUB_URL:-http://127.0.0.1:8081}"
DOCS_URL="${DOCS_URL:-}"
MAIL_URL="${MAIL_URL:-}"
SMS_URL="${SMS_URL:-}"
BANK_WEBHOOK_URL="${BANK_WEBHOOK_URL:-}"

fail() { echo "FAIL: $*" >&2; exit 1; }

echo "== core health =="
curl -sf "$BASE/api/v1/health" >/dev/null || fail "core health"

echo "== hub health =="
curl -sf "$HUB/api/v1/health" >/dev/null || fail "hub health"

echo "== seed login =="
login_body=$(curl -sS -o /tmp/vdp-staging-login.json -w '%{http_code}' -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@vdp.local","password":"user"}' || true)
if [[ "$login_body" -lt 200 || "$login_body" -ge 300 ]]; then
  fail "seed login status=$login_body body=$(cat /tmp/vdp-staging-login.json 2>/dev/null || true)"
fi
python3 - <<'PY' || fail "seed login response missing token"
import json
with open("/tmp/vdp-staging-login.json") as f:
    d = json.load(f)
assert d.get("token") or d.get("access_token"), d
print("seed login ok")
PY

if [[ -n "$DOCS_URL" ]]; then
  echo "== DOCS_URL probe =="
  code=$(curl -s -o /tmp/vdp-docs-smoke.json -w '%{http_code}' -X POST "$DOCS_URL" \
    -H 'Content-Type: application/json' \
    -d '{"form_payment_id":"staging-smoke","kind":"import_order","probe":true}' || true)
  if [[ "$code" -lt 200 || "$code" -ge 500 ]]; then
    fail "DOCS_URL POST status=$code"
  fi
  gen_code=$(curl -s -o /tmp/vdp-docs-smoke-gen.json -w '%{http_code}' -X POST "$DOCS_URL" \
    -H 'Content-Type: application/json' \
    -d '{"form_payment_id":"staging-smoke","kind":"import_order","organization_name":"Smoke Org"}' || true)
  if [[ "$gen_code" -lt 200 || "$gen_code" -ge 300 ]]; then
    fail "DOCS_URL generate status=$gen_code"
  fi
  python3 - <<'PY' || fail "DOCS_URL response missing storage_key"
import json
with open("/tmp/vdp-docs-smoke-gen.json") as f:
    d = json.load(f)
assert d.get("storage_key"), d
assert d.get("mime") == "application/pdf", d
print("DOCS_URL storage_key ok")
PY
  echo "DOCS_URL ok probe=$code generate=$gen_code"
else
  echo "SKIP DOCS_URL (empty)"
fi

if [[ -n "$MAIL_URL" ]]; then
  echo "== MAIL_URL probe =="
  code=$(curl -s -o /tmp/vdp-mail-smoke.json -w '%{http_code}' -X POST "$MAIL_URL" \
    -H 'Content-Type: application/json' \
    -d '{"form_payment_id":"staging-smoke","channel":"mail","probe":true}' || true)
  if [[ "$code" -lt 200 || "$code" -ge 500 ]]; then
    fail "MAIL_URL POST status=$code"
  fi
  echo "MAIL_URL ok status=$code"
else
  echo "SKIP MAIL_URL (empty)"
fi

if [[ -n "$SMS_URL" ]]; then
  echo "== SMS_URL probe =="
  code=$(curl -s -o /tmp/vdp-sms-smoke.json -w '%{http_code}' -X POST "$SMS_URL" \
    -H 'Content-Type: application/json' \
    -d '{"form_payment_id":"staging-smoke","channel":"sms","probe":true}' || true)
  if [[ "$code" -lt 200 || "$code" -ge 500 ]]; then
    fail "SMS_URL POST status=$code"
  fi
  echo "SMS_URL ok status=$code"
else
  echo "SKIP SMS_URL (empty)"
fi

if [[ -n "$BANK_WEBHOOK_URL" ]]; then
  echo "== bank webhook probe =="
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BANK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d '{"event":"staging_smoke","form_payment_id":"staging-smoke"}' || true)
  if [[ "$code" -lt 200 || "$code" -ge 500 ]]; then
    fail "BANK_WEBHOOK_URL status=$code"
  fi
  echo "bank webhook ok status=$code"
else
  echo "SKIP BANK_WEBHOOK_URL (empty)"
fi

echo "staging-smoke passed"
