#!/usr/bin/env bash
# Exit 0 if stdin path list matches pilot-matrix ladder surface; else exit 1.
# Pattern file is the single source of truth for GitHub CI and local pre-push.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATTERN_FILE="${PILOT_MATRIX_PATHS_FILE:-$ROOT/scripts/pilot-matrix-paths.grep}"
if [ ! -f "$PATTERN_FILE" ]; then
  echo "missing pilot-matrix paths file: $PATTERN_FILE" >&2
  exit 2
fi
grep -E -f "$PATTERN_FILE" >/dev/null
