#!/usr/bin/env bash
# Import customer deal fixtures into testdata/robot-fixtures/packs/customer.
# Usage: ./scripts/robot-fixtures-import.sh /path/to/dir-or.zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/testdata/robot-fixtures/packs/customer"
SRC="${1:-}"

if [[ -z "$SRC" ]]; then
  echo "usage: $0 /path/to/customer-fixtures-dir-or.zip" >&2
  exit 2
fi

if [[ ! -e "$SRC" ]]; then
  echo "FAIL: source not found: $SRC" >&2
  exit 1
fi

TMP=""
cleanup() {
  if [[ -n "$TMP" && -d "$TMP" ]]; then
    rm -rf "$TMP"
  fi
}
trap cleanup EXIT

STAGE="$SRC"
if [[ -f "$SRC" && "$SRC" == *.zip ]]; then
  TMP="$(mktemp -d)"
  unzip -q "$SRC" -d "$TMP"
  STAGE="$TMP"
  # If zip has a single top folder, use it.
  if [[ "$(find "$TMP" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')" == "1" ]]; then
    STAGE="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
  fi
fi

mkdir -p "$DEST/docs"

if [[ -f "$STAGE/pack.json" ]]; then
  cp "$STAGE/pack.json" "$DEST/pack.json"
elif [[ -f "$STAGE/packs/customer/pack.json" ]]; then
  cp "$STAGE/packs/customer/pack.json" "$DEST/pack.json"
else
  echo "FAIL: pack.json not found under $STAGE (expected pack.json with deal fields)" >&2
  exit 1
fi

DOC_SRC="$STAGE/docs"
if [[ ! -d "$DOC_SRC" && -d "$STAGE/packs/customer/docs" ]]; then
  DOC_SRC="$STAGE/packs/customer/docs"
fi
if [[ -d "$DOC_SRC" ]]; then
  find "$DOC_SRC" -type f \( -name '*.pdf' -o -name '*.PDF' -o -name '*.png' -o -name '*.jpg' \) \
    -exec cp {} "$DEST/docs/" \;
fi

# Clear awaiting_import so robots accept the pack.
python3 - <<'PY' "$DEST/pack.json"
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    pack = json.load(f)
pack["status"] = "ready"
pack["pack_id"] = "customer"
if not pack.get("counterparty", {}).get("name"):
    raise SystemExit("FAIL: pack.json counterparty.name is empty after import")
if not pack.get("deal_fields", {}).get("invoice_amount") or pack["deal_fields"]["invoice_amount"] in ("0", "0.00", ""):
    raise SystemExit("FAIL: pack.json deal_fields.invoice_amount must be set")
with open(path, "w", encoding="utf-8") as f:
    json.dump(pack, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("customer pack status=ready")
PY

echo "imported customer fixtures → $DEST"
echo "activate: export VDP_ROBOT_FIXTURE_PACK=customer"
