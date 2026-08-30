#!/usr/bin/env bash
# Staging smoke: core/hub health + optional DOCS_URL / MAIL_URL / bank webhook reachability.
# Run against staging after exporting vars from docs/operations/staging-env.example.
set -euo pipefail

BASE="${CORE_URL:-http://127.0.0.1:8080}"
HUB="${HUB_URL:-http://127.0.0.1:8081}"
DOCS_URL="${DOCS_URL:-}"
MAIL_URL="${MAIL_URL:-}"
BANK_WEBHOOK_URL="${BANK_WEBHOOK_URL:-}"

fail() { echo "FAIL: $*" >&2; exit 1; }

echo "== core health =="
curl -sf "$BASE/api/v1/health" >/dev/null || fail "core health"

echo "== hub health =="
curl -sf "$HUB/api/v1/health" >/dev/null || fail "hub health"

if [[ -n "$DOCS_URL" ]]; then
  echo "== DOCS_URL probe =="
  code=$(curl -s -o /tmp/vdp-docs-smoke.json -w '%{http_code}' -X POST "$DOCS_URL" \
    -H 'Content-Type: application/json' \
    -d '{"form_payment_id":"staging-smoke","kind":"payment_order","probe":true}' || true)
  if [[ "$code" -lt 200 || "$code" -ge 500 ]]; then
    fail "DOCS_URL POST status=$code"
  fi
  echo "DOCS_URL ok status=$code"
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
