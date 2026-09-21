#!/usr/bin/env bash
# Path-aware pre-push gate:
# - e2e outside narrow PR-smoke → ci-main (main-push full Playwright parity)
# - ladder surface (pilot-matrix paths) → ci-pr-pilot
# - else → ci-pr
# Emergency bypass: SKIP_PREPUSH_GATE=1 (prints warn, exit 0).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
MATCH="$ROOT/scripts/pilot-matrix-paths-match.sh"
FULL_E2E="$ROOT/scripts/main-full-e2e-paths-match.sh"

if [ "${SKIP_PREPUSH_GATE:-0}" = "1" ]; then
  echo "WARNING: SKIP_PREPUSH_GATE=1 — pre-push gate skipped. Push is not locally insured." >&2
  exit 0
fi

chmod +x "$MATCH" "$FULL_E2E" 2>/dev/null || true

cd "$REPO_ROOT"
base=""
if git rev-parse --verify @{upstream} >/dev/null 2>&1; then
  base="$(git merge-base HEAD @{upstream} 2>/dev/null || true)"
fi
if [ -z "$base" ] && git rev-parse --verify origin/main >/dev/null 2>&1; then
  base="$(git merge-base HEAD origin/main 2>/dev/null || true)"
fi
if [ -z "$base" ] && git rev-parse --verify origin/master >/dev/null 2>&1; then
  base="$(git merge-base HEAD origin/master 2>/dev/null || true)"
fi
if [ -z "$base" ]; then
  echo "prepush-gate: no upstream/origin/main base — running ci-pr-pilot (safe default)" >&2
  cd "$ROOT"
  exec make ci-pr-pilot
fi

changed="$(git diff --name-only "$base"...HEAD || true)"
# Include unstaged/staged working tree vs HEAD so uncommitted push attempts still gate.
wt="$(git diff --name-only HEAD 2>/dev/null || true)"
staged="$(git diff --cached --name-only 2>/dev/null || true)"
all_paths="$(printf '%s\n%s\n%s\n' "$changed" "$wt" "$staged" | sed '/^$/d' | sort -u)"

echo "prepush-gate: base=$base"
if [ -z "$all_paths" ]; then
  echo "prepush-gate: no changed files vs base — running ci-pr"
  cd "$ROOT"
  exec make ci-pr
fi

if printf '%s\n' "$all_paths" | "$FULL_E2E"; then
  echo "prepush-gate: e2e outside PR-smoke → make ci-main (main-push Playwright parity)"
  cd "$ROOT"
  exec make ci-main
fi

if printf '%s\n' "$all_paths" | "$MATCH"; then
  echo "prepush-gate: ladder paths detected → make ci-pr-pilot"
  cd "$ROOT"
  exec make ci-pr-pilot
fi

echo "prepush-gate: no ladder / full-e2e paths → make ci-pr"
cd "$ROOT"
exec make ci-pr
