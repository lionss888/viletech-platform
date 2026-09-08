#!/usr/bin/env bash
# Local pre-commit gate: run make test, then notify management (pass and fail).
# Missing MGMT_NOTIFY token/chat → notify skips; tests still required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"
cd "$ROOT"

REVISION="$(git -C "$ROOT/.." rev-parse --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo local)"
STATUS=passed
set +e
make test
CODE=$?
set -e

if [ "$CODE" -ne 0 ]; then
  STATUS=failed
fi

chmod +x "$NOTIFY"
"$NOTIFY" --kind gate --title "локальная приёмка" --status "$STATUS" --revision "$REVISION" || true

exit "$CODE"
