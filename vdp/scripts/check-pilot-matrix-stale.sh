#!/usr/bin/env bash
# Fail if @pilot-matrix specs carry known-stale CTA markers (TEST_STALE / missing wizard button).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPECS=(
  "$ROOT/fe/e2e/pilot-matrix-full-ladder.spec.ts"
  "$ROOT/fe/e2e/pilot-matrix-postpay-rate.spec.ts"
)

FAILED=0
for spec in "${SPECS[@]}"; do
  [ -f "$spec" ] || {
    echo "FAIL: missing $spec" >&2
    FAILED=1
    continue
  }
  if grep -nE 'STALE:|TEST_STALE|Создать черновик' "$spec"; then
    echo "FAIL: stale marker or missing CTA copy in $spec" >&2
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo "pilot-matrix must not ship STALE comments or locator «Создать черновик»" >&2
  exit 1
fi

echo "pilot-matrix stale check ok"
