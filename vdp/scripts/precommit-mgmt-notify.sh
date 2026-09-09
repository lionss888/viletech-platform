#!/usr/bin/env bash
# Local pre-commit gate: docs-format-check + make test, then notify management (pass and fail).
# Missing MGMT_NOTIFY token/chat → notify skips; gates still required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"
cd "$ROOT"

REVISION="$(git -C "$ROOT/.." rev-parse --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo local)"
STATUS=passed
CODE=0

set +e
make docs-format-check
DOCS_CODE=$?
set -e
if [ "$DOCS_CODE" -ne 0 ]; then
  CODE=$DOCS_CODE
  STATUS=failed
fi

# Still run unit tests when docs fail so the notify body reflects both surfaces.
set +e
make test
TEST_CODE=$?
set -e
if [ "$TEST_CODE" -ne 0 ]; then
  CODE=$TEST_CODE
  STATUS=failed
fi

chmod +x "$NOTIFY"
"$NOTIFY" --kind gate --title "локальная приёмка" --status "$STATUS" --revision "$REVISION" || true

exit "$CODE"
