#!/usr/bin/env bash
# ci-pr static phase: run all independent checks in parallel, aggregate exit codes.
# Phase 2 (compose-e2e) runs only if phase 1 is green.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# GUI git clients (GitHub Desktop) often lack nvm/mise on PATH.
PINNED_GO_BIN="$("$ROOT/scripts/resolve-pinned-go.sh" 2>/dev/null || true)"
if [ -n "${PINNED_GO_BIN:-}" ]; then
  export PATH="${PINNED_GO_BIN}:${PATH}"
  if [ -d "${PINNED_GO_BIN}/../" ]; then
    export GOROOT="$(cd "${PINNED_GO_BIN}/.." && pwd)"
  fi
fi
PINNED_NODE_BIN="$("$ROOT/scripts/resolve-pinned-node.sh" 2>/dev/null || true)"
if [ -n "${PINNED_NODE_BIN:-}" ]; then
  export PATH="${PINNED_NODE_BIN}:${PATH}"
fi

echo "=== CI-PR Static Phase (run-all + parallel) ==="
echo ""

# Arrays for tracking
NAMES=()
PIDS=()
TMPDIR="${TMPDIR:-/tmp}"

run_bg() {
  local name="$1"
  shift
  local idx="${#NAMES[@]}"
  local tmpfile="$TMPDIR/ci-pr-static-$$-$idx"
  
  NAMES+=("$name")
  
  # Run in background, capture exit code to temp file
  (
    set +e
    "$@" >/dev/null 2>&1
    echo $? > "$tmpfile"
  ) &
  PIDS+=($!)
}

# Launch all checks in parallel
echo "Launching parallel checks..."

# Make targets
run_bg "docs-format-check" make docs-format-check
run_bg "perf-gate" make perf-gate
run_bg "test-cd-scripts" make test-cd-scripts
run_bg "check-deploy-secrets" make check-deploy-secrets
run_bg "test-adapters" make test-adapters
run_bg "lovable-seed-check" make lovable-seed-check
run_bg "pilot-matrix-stale" bash scripts/check-pilot-matrix-stale.sh
run_bg "platform-mounts" bash scripts/check-platform-mounts.sh

# FE unit
run_bg "fe-npm-test" sh -c "cd fe && npm test"

# Go modules (8 separate test invocations)
run_bg "go-test-core" sh -c "cd core && go test ./..."
run_bg "go-test-hub" sh -c "cd hub && go test ./..."
run_bg "go-test-shared" sh -c "cd shared && go test ./..."
run_bg "go-test-extraction" sh -c "cd extraction && go test ./..."
run_bg "go-test-mail-gateway" sh -c "cd mail-gateway && go test ./..."
run_bg "go-test-sms-gateway" sh -c "cd sms-gateway && go test ./..."
run_bg "go-test-manager-ops" sh -c "cd manager-ops && go test ./..."
run_bg "go-test-release-gate" sh -c "cd release-gate && go test ./..."

echo "Waiting for ${#NAMES[@]} checks to complete..."
echo ""

# Wait for all
for pid in "${PIDS[@]}"; do
  wait "$pid" || true
done

echo "=== Results ==="
echo ""
printf "%-30s %s\n" "Check" "Status"
printf "%-30s %s\n" "------------------------------" "------"

FAILED=0
for idx in "${!NAMES[@]}"; do
  name="${NAMES[$idx]}"
  tmpfile="$TMPDIR/ci-pr-static-$$-$idx"
  
  if [ -f "$tmpfile" ]; then
    code=$(cat "$tmpfile")
    rm -f "$tmpfile"
  else
    code=999
  fi
  
  if [ "$code" -eq 0 ]; then
    printf "%-30s ✅ PASS\n" "$name"
  else
    printf "%-30s ❌ FAIL (exit %d)\n" "$name" "$code"
    FAILED=1
  fi
done

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "✅ Static phase: PASS"
  exit 0
else
  echo "❌ Static phase: FAIL"
  exit 1
fi
