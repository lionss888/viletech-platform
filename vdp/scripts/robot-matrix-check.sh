#!/usr/bin/env bash
# Assert Pilot Robot Matrix contract files exist and catalog IDs are listed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX="$ROOT/testdata/robot-fixtures"
MATRIX_DOC="$ROOT/docs/development/e2e-coverage-matrix.md"
ROWS="$FIX/matrix-rows.json"

fail() { echo "FAIL: $*" >&2; exit 1; }

[[ -f "$FIX/manifest.json" ]] || fail "missing manifest.json"
[[ -f "$FIX/packs/template/pack.json" ]] || fail "missing template pack.json"
[[ -f "$ROWS" ]] || fail "missing matrix-rows.json"
[[ -f "$MATRIX_DOC" ]] || fail "missing e2e-coverage-matrix.md"

grep -q 'Pilot Robot Matrix' "$MATRIX_DOC" || fail "matrix doc missing Pilot Robot Matrix section"
grep -q 'playwright-pilot-matrix' "$MATRIX_DOC" || fail "matrix doc missing playwright-pilot-matrix"
grep -q 'VDP_ROBOT_FIXTURE_PACK' "$MATRIX_DOC" || fail "matrix doc missing VDP_ROBOT_FIXTURE_PACK"

python3 - <<'PY' "$ROWS" "$ROOT/core/internal/scenarioverify/catalog.go"
import json, re, sys
rows_path, catalog_path = sys.argv[1], sys.argv[2]
rows = json.load(open(rows_path))["rows"]
ids = {r["id"] for r in rows}
catalog = open(catalog_path, encoding="utf-8").read()
required = [
    "happy_path_to_completed",
    "continuity_manager_form_approve",
    "manager_reject_to_corrections",
    "user_resubmit_after_reject",
    "manager_payment_assign_provider",
    "provider_payment_no_pii",
    "root_cancel",
    "doc_preview_visible",
    "extraction_confirm_updates_amount",
    "manager_hides_drafts",
    "refund_smoke",
    "bank_channel_badge",
]
missing = [i for i in required if i not in ids and i != "happy_path_shipment_branch"]
# shipment is matrix extension id, not catalog const
for i in required:
    if i == "happy_path_shipment_branch":
        continue
    if f'"{i}"' not in catalog and f'= "{i}"' not in catalog:
        # catalog uses const values
        if i not in catalog:
            raise SystemExit(f"FAIL: catalog.go missing scenario id {i}")
print(f"robot-matrix-check ok rows={len(rows)}")
PY

# Template must not use demo mock names
if grep -E 'Shenzhen Kaiyuan|Anadolu Makina|Emirates General Trading' \
  "$FIX/packs/template/pack.json"; then
  fail "template pack contains demo mock names"
fi

echo "robot-matrix-check green"
