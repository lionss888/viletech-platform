#!/usr/bin/env bash
# After customer pack import + robot runs, summarize matrix fixture status.
# Usage: ./scripts/robot-matrix-discrepancy-report.sh [pass|fail]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROWS="$ROOT/testdata/robot-fixtures/matrix-rows.json"
PACK="${VDP_ROBOT_FIXTURE_PACK:-template}"
RESULT="${1:-unknown}"
OUT="${ROOT}/testdata/robot-fixtures/last-discrepancy-report.txt"

{
  echo "Pilot Robot Matrix discrepancy report"
  echo "pack=${PACK}"
  echo "result=${RESULT}"
  echo "generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "---"
  python3 - <<'PY' "$ROWS" "$PACK"
import json, sys
rows = json.load(open(sys.argv[1]))["rows"]
pack = sys.argv[2]
for r in rows:
    fid = r.get("fixture", "")
    note = "customer_ready" if pack == "customer" and "customer" in fid else fid
    if pack == "template" and "customer" in str(fid):
        note = "template_interim (swap pending)"
    print(f"{r['id']}: api={r.get('api')} ui={r.get('ui_ladder')} fixture={note}")
PY
  echo "---"
  if [[ "$PACK" == "customer" && "$RESULT" == "pass" ]]; then
    echo "QG customer layer: eligible (after release-gate green)"
  elif [[ "$PACK" == "customer" && "$RESULT" != "pass" ]]; then
    echo "QG customer layer: blocked — fix failures (logic/UI) or extend matrix for out-of-scope cases"
  else
    echo "QG customer layer: not claimed (active pack=template)"
  fi
} | tee "$OUT"

echo "wrote $OUT"
