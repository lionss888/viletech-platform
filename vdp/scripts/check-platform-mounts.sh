#!/usr/bin/env bash
# Fail if a required platform-only widget is on disk but not mounted in its live host.
# Soft defer ("file exists, re-wire later") is a defect, not a TODO.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

fail() {
  echo "FAIL: $*" >&2
  FAILED=1
}

HOST="$ROOT/fe/src/components/ved/pages/form-detail-page.tsx"
PANEL="$ROOT/fe/src/components/ved/ManagerRouteHintPanel.tsx"
AGENTS="$ROOT/fe/AGENTS.md"

[ -f "$HOST" ] || fail "missing host $HOST"
[ -f "$PANEL" ] || fail "missing panel $PANEL"
[ -f "$AGENTS" ] || fail "missing $AGENTS"

if [ -f "$HOST" ] && ! grep -q 'ManagerRouteHintPanel' "$HOST"; then
  fail "form-detail-page.tsx must mount ManagerRouteHintPanel (orphan mount)"
fi

if [ -f "$PANEL" ] && ! grep -q 'data-testid="manager-route-hint"' "$PANEL"; then
  fail 'ManagerRouteHintPanel.tsx must keep data-testid="manager-route-hint"'
fi

# Forbidden process phrase: accepting a missing mount as a later chore.
if [ -f "$AGENTS" ] && grep -q 're-wire into form-detail-page if needed' "$AGENTS"; then
  fail "fe/AGENTS.md must not defer the manager route hint mount"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "platform mounts check failed: a visible platform widget is not wired into its live host" >&2
  exit 1
fi

echo "platform mounts check ok"
