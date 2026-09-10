#!/usr/bin/env bash
# Local pre-commit gate: docs-format-check + make test.
# Notify management only on fail (green local gate stays out of mgmt chat).
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

# Management chat: product language only. Do not spam bare "локальная приёмка" on green.
# Notify only on failed local gate — with a short human body.
if [ "$STATUS" = failed ]; then
  BODY="Локальные проверки перед коммитом не прошли. Коммит не принят, пока не исправят."
  if [ "$DOCS_CODE" -ne 0 ] && [ "$TEST_CODE" -ne 0 ]; then
    BODY="Не прошли проверки документации и юнит-проверки. Коммит не принят."
  elif [ "$DOCS_CODE" -ne 0 ]; then
    BODY="Не прошла проверка документации. Коммит не принят."
  elif [ "$TEST_CODE" -ne 0 ]; then
    BODY="Не прошли юнит-проверки. Коммит не принят."
  fi
  chmod +x "$NOTIFY"
  "$NOTIFY" --kind gate --title "проверки перед коммитом" --status failed --revision "$REVISION" --body "$BODY" || true
fi

exit "$CODE"
