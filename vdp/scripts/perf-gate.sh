#!/usr/bin/env bash
# Local performance gate: status-transition lookup must stay under a time budget.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 100µs per lookup: clone+merge of the SM table is ~8µs locally; UI budget is 400ms.
MAX_NS_OP="${PERF_GATE_MAX_NS_OP:-100000}"
PKG="./internal/domain/formpayment"
BENCH="BenchmarkIsAllowedTransition"

fail() { echo "FAIL: $*" >&2; exit 1; }

OUT="$(cd "$ROOT/core" && go test -bench="$BENCH" -benchtime=200ms -count=1 "$PKG")"
echo "$OUT"

LINE="$(printf '%s\n' "$OUT" | grep -E "^${BENCH}" | tail -1)" || true
[[ -n "$LINE" ]] || fail "no benchmark line for $BENCH"

NS="$(printf '%s\n' "$LINE" | awk '{
  for (i = 1; i <= NF; i++) {
    if ($i == "ns/op") { print $(i-1); exit }
  }
}')"
[[ -n "$NS" ]] || fail "could not parse ns/op from: $LINE"

python3 - "$NS" "$MAX_NS_OP" "$LINE" <<'PY'
import sys
ns = float(sys.argv[1])
limit = float(sys.argv[2])
line = sys.argv[3]
if ns > limit:
    raise SystemExit(
        f"FAIL: status transition {ns:.0f} ns/op exceeds budget {limit:.0f} ns/op ({line})"
    )
print(f"perf-gate green {ns:.0f} ns/op (budget {limit:.0f}) {line}")
PY
