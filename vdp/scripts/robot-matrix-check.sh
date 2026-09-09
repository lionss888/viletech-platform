#!/usr/bin/env bash
# Assert Pilot Robot Matrix: all catalog IDs present in matrix-rows + handbook link.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX="$ROOT/testdata/robot-fixtures"
MATRIX_DOC="$ROOT/docs/development/e2e-coverage-matrix.md"
HANDBOOK="$ROOT/docs/pilot/scenario-role-directory.md"
ROWS="$FIX/matrix-rows.json"
CATALOG="$ROOT/core/internal/scenarioverify/catalog.go"

fail() { echo "FAIL: $*" >&2; exit 1; }

[[ -f "$FIX/manifest.json" ]] || fail "missing manifest.json"
[[ -f "$FIX/packs/template/pack.json" ]] || fail "missing template pack.json"
[[ -f "$ROWS" ]] || fail "missing matrix-rows.json"
[[ -f "$MATRIX_DOC" ]] || fail "missing e2e-coverage-matrix.md"
[[ -f "$HANDBOOK" ]] || fail "missing scenario-role-directory.md"

grep -q 'Pilot Robot Matrix' "$MATRIX_DOC" || fail "matrix doc missing Pilot Robot Matrix section"
grep -q 'playwright-pilot-matrix' "$MATRIX_DOC" || fail "matrix doc missing playwright-pilot-matrix"
grep -q 'VDP_ROBOT_FIXTURE_PACK' "$MATRIX_DOC" || fail "matrix doc missing VDP_ROBOT_FIXTURE_PACK"
grep -q 'scenario-role-directory' "$MATRIX_DOC" || fail "matrix doc must link scenario-role-directory"

python3 - <<'PY' "$ROWS" "$CATALOG" "$HANDBOOK"
import json, re, sys
rows_path, catalog_path, handbook_path = sys.argv[1], sys.argv[2], sys.argv[3]
rows = json.load(open(rows_path))["rows"]
ids = {r["id"] for r in rows}
catalog = open(catalog_path, encoding="utf-8").read()
# Extract const string values like = "happy_path_to_completed"
catalog_ids = set(re.findall(r'=\s*"(happy_path_to_completed|eco_reject_resubmit|ico_org_pending_approve|manager_payment_assign_provider|provider_payment_no_pii|bank_channel_badge|root_cancel|refund_smoke|manager_hides_drafts|doc_preview_visible|health_core|continuity_manager_form_approve|manager_reject_to_corrections|user_resubmit_after_reject|provider_return_to_manager|extraction_confirm_updates_amount|manager_sets_deal_rate)"', catalog))
if len(catalog_ids) != 17:
    # fallback: all quoted scenario-like ids from const block
    catalog_ids = set(re.findall(r'ID\w+\s*=\s*"([a-z0-9_]+)"', catalog))
missing = sorted(catalog_ids - ids)
if missing:
    raise SystemExit(f"FAIL: matrix-rows missing catalog ids: {missing}")
handbook = open(handbook_path, encoding="utf-8").read()
for cid in sorted(catalog_ids):
    if cid not in handbook:
        raise SystemExit(f"FAIL: handbook missing scenario id {cid}")
# soft_skip_forbidden must be noted for ico
ico_row = next(r for r in rows if r["id"] == "ico_org_pending_approve")
if ico_row.get("note") != "soft_skip_forbidden":
    raise SystemExit("FAIL: ico_org_pending_approve must note soft_skip_forbidden")
print(f"robot-matrix-check ok catalog={len(catalog_ids)} rows={len(rows)}")
PY

if grep -E 'Shenzhen Kaiyuan|Anadolu Makina|Emirates General Trading' \
  "$FIX/packs/template/pack.json"; then
  fail "template pack contains demo mock names"
fi

echo "robot-matrix-check green"
