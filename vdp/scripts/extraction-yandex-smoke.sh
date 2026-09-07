#!/usr/bin/env bash
# Smoke extraction Yandex PRIMARY. Reads env / optional vdp/.env — never pass key as CLI arg.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BASE="${EXTRACTION_SMOKE_URL:-http://127.0.0.1:8093}"
PRIMARY="${EXTRACTION_PRIMARY:-fixture}"

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/vdp-extraction-health.json
echo

echo "== recognize (text invoice) =="
curl -sS -X POST "$BASE/recognize" \
  -H 'content-type: application/json' \
  -d '{"form_payment_id":"smoke-form-1","event_id":"smoke-ev-1","payload":{"file_name":"invoice.txt","text":"Invoice INV-42 dated 2026-01-15. Amount 1500.00 USD. Seller Acme LLC. Line 1: Widget A qty 2 unit 750.00 total 1500.00"}}' \
  | tee /tmp/vdp-extraction-recognize.json
echo

MODE="$(python3 -c "import json; print(json.load(open('/tmp/vdp-extraction-recognize.json')).get('mode',''))" 2>/dev/null || true)"
HAS_JSON="$(python3 -c "import json; f=json.load(open('/tmp/vdp-extraction-recognize.json')).get('fields') or {}; print('yes' if f.get('invoice_json') else 'no')" 2>/dev/null || echo no)"

echo "primary_env=$PRIMARY mode=$MODE invoice_json=$HAS_JSON"

if [[ "$HAS_JSON" != "yes" ]]; then
  echo "FAIL: missing fields.invoice_json" >&2
  exit 1
fi

if [[ -z "${YANDEX_API_KEY:-}" || -z "${YANDEX_FOLDER_ID:-}" ]]; then
  echo "NOTE: YANDEX_API_KEY and/or YANDEX_FOLDER_ID unset — expect fixture (or fixture_error) mode, not live yandex."
  exit 0
fi

if [[ "$MODE" != *yandex* ]]; then
  echo "WARN: keys set but mode=$MODE (fallback or force-fixture). Check folder/model URI and API errors in extraction logs." >&2
  exit 0
fi

echo "OK: live yandex path responded with invoice_json"
