#!/usr/bin/env bash
# Smoke extraction docTR FALLBACK path (local compose). Hits extraction recognize with text payload.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export EXTRACTION_SMOKE_URL="${EXTRACTION_SMOKE_URL:-http://127.0.0.1:8093}"
BASE="$EXTRACTION_SMOKE_URL"

echo "== extraction health =="
curl -sS "$BASE/health" | tee /tmp/vdp-extraction-health.json
echo

FALLBACK="$(python3 -c "import json; print(json.load(open('/tmp/vdp-extraction-health.json')).get('fallback',''))")"
DOCTR_SET="$(python3 -c "import json; print(json.load(open('/tmp/vdp-extraction-health.json')).get('doctr_url_set', False))")"
echo "fallback=$FALLBACK doctr_url_set=$DOCTR_SET"

if [[ "$FALLBACK" != "doctr" ]]; then
  echo "FAIL: expected extraction health fallback=doctr (got $FALLBACK)." >&2
  exit 1
fi

echo "== doctr sidecar health (optional) =="
DOCTR_URL="${EXTRACTION_DOCTR_URL:-http://127.0.0.1:5002}"
# Host cannot reach internal compose DNS; probe via extraction health flag when set.
DOCTR_OK="$(python3 -c "import json; print(json.load(open('/tmp/vdp-extraction-health.json')).get('doctr_reachable', False))")"
echo "doctr_reachable=$DOCTR_OK"

echo "== recognize plain text via doctr engine unit path (extraction maps text) =="
python3 <<'PY'
import base64, json, os, urllib.request

base = os.environ.get("EXTRACTION_SMOKE_URL", "http://127.0.0.1:8093")
text = b"Invoice INV-DOCTR dated 2026-01-15.\nAmount 42.00 EUR.\nSeller DocTR LLC."
body = {
    "form_payment_id": "smoke-doctr-1",
    "event_id": "smoke-ev-doctr",
    "payload": {
        "file_name": "invoice.txt",
        "mime": "text/plain",
        "content_base64": base64.b64encode(text).decode(),
    },
}
req = urllib.request.Request(
    base + "/recognize",
    data=json.dumps(body).encode(),
    headers={"content-type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req, timeout=120) as res:
    out = json.loads(res.read().decode())
with open("/tmp/vdp-extraction-doctr-recognize.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
mode = out.get("mode", "")
fields = out.get("fields") or {}
inv = fields.get("invoice_json")
if not inv:
    raise SystemExit("FAIL: missing fields.invoice_json")
doc = json.loads(inv) if isinstance(inv, str) else inv
engine = (doc.get("meta") or {}).get("engine_id", "")
print(f"mode={mode} engine={engine}")
# PRIMARY docling may succeed on text via convert, or fallback doctr — either is OK for smoke.
if "docling" not in mode and "doctr" not in mode and "docling" not in engine and "doctr" not in engine:
    raise SystemExit(f"FAIL: expected docling/doctr mode/engine, got mode={mode} engine={engine}")
if "fixture" in mode or engine == "fixture":
    raise SystemExit(f"FAIL: fixture not allowed in demo path: mode={mode} engine={engine}")
print("OK: recognize returned invoice_json without fixture")
PY
