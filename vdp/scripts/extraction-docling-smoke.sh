#!/usr/bin/env bash
# Smoke extraction Docling PRIMARY (local compose). Hits extraction; Docling must be reachable from that container.
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
PRIMARY="${EXTRACTION_PRIMARY:-docling}"

echo "== extraction health =="
curl -sS "$BASE/health" | tee /tmp/vdp-extraction-health.json
echo

PRIMARY_HEALTH="$(python3 -c "import json; print(json.load(open('/tmp/vdp-extraction-health.json')).get('primary',''))")"
DOCLING_SET="$(python3 -c "import json; print(json.load(open('/tmp/vdp-extraction-health.json')).get('docling_url_set', False))")"
echo "primary_env=$PRIMARY health_primary=$PRIMARY_HEALTH docling_url_set=$DOCLING_SET"

if [[ "$PRIMARY_HEALTH" != "docling" ]]; then
  echo "FAIL: expected extraction health primary=docling (got $PRIMARY_HEALTH). Set EXTRACTION_PRIMARY=docling and EXTRACTION_DOCLING_URL." >&2
  exit 1
fi

echo "== recognize (content_base64 invoice) =="
python3 <<'PY'
import base64, json, os, urllib.request

base = os.environ.get("EXTRACTION_SMOKE_URL", "http://127.0.0.1:8093")
text = b"Invoice INV-42 dated 2026-01-15.\nAmount 1500.00 USD.\nSeller Acme LLC."
body = {
    "form_payment_id": "smoke-docling-1",
    "event_id": "smoke-ev-docling",
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
with open("/tmp/vdp-extraction-docling-recognize.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
mode = out.get("mode", "")
fields = out.get("fields") or {}
inv = fields.get("invoice_json")
if not inv:
    raise SystemExit("FAIL: missing fields.invoice_json")
doc = json.loads(inv) if isinstance(inv, str) else inv
engine = (doc.get("meta") or {}).get("engine_id", "")
print(f"mode={mode} engine={engine}")
if "docling" not in mode and engine != "docling":
    raise SystemExit(f"FAIL: expected docling mode/engine, got mode={mode} engine={engine}")
print("OK: Docling PRIMARY path returned invoice_json")
PY
