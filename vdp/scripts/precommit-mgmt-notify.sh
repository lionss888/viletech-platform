#!/usr/bin/env bash
# Local pre-commit gate: docs-format-check + make test + path-aware fe npm test.
# Notify management only on fail (green local gate stays out of mgmt chat).
# Missing MGMT_NOTIFY token/chat → notify skips; gates still required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

# GUI git clients (GitHub Desktop) often lack nvm/mise on PATH — pin Node like Makefile.
PINNED_NODE_BIN="$("$ROOT/scripts/resolve-pinned-node.sh" 2>/dev/null || true)"
if [ -n "${PINNED_NODE_BIN:-}" ]; then
  export PATH="${PINNED_NODE_BIN}:${PATH}"
fi

REVISION="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo local)"
STATUS=passed
CODE=0
DOCS_CODE=0
TEST_CODE=0
FE_CODE=0
FE_RAN=0

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

# Path-aware FE unit: only when staged paths touch fe/ (repo-root or vdp-relative).
STAGED="$(git -C "$REPO_ROOT" diff --cached --name-only 2>/dev/null || true)"
if printf '%s\n' "$STAGED" | grep -E -q '^(vdp/)?fe/'; then
  FE_RAN=1
  set +e
  (cd "$ROOT/fe" && npm test)
  FE_CODE=$?
  set -e
  if [ "$FE_CODE" -ne 0 ]; then
    CODE=$FE_CODE
    STATUS=failed
  fi
fi

# Management chat: product language only. Do not spam bare "локальная приёмка" on green.
# Notify only on failed local gate — with a short human body.
if [ "$STATUS" = failed ]; then
  BODY="Локальные проверки перед коммитом не прошли. Коммит не принят, пока не исправят."
  FAIL_PARTS=()
  if [ "$DOCS_CODE" -ne 0 ]; then
    FAIL_PARTS+=("документации")
  fi
  if [ "$TEST_CODE" -ne 0 ]; then
    FAIL_PARTS+=("юнит-проверки")
  fi
  if [ "$FE_RAN" -eq 1 ] && [ "$FE_CODE" -ne 0 ]; then
    FAIL_PARTS+=("юнит FE")
  fi
  if [ "${#FAIL_PARTS[@]}" -eq 1 ]; then
    BODY="Не прошла проверка ${FAIL_PARTS[0]}. Коммит не принят."
  elif [ "${#FAIL_PARTS[@]}" -eq 2 ]; then
    BODY="Не прошли проверки ${FAIL_PARTS[0]} и ${FAIL_PARTS[1]}. Коммит не принят."
  elif [ "${#FAIL_PARTS[@]}" -ge 3 ]; then
    BODY="Не прошли проверки документации, юнит-проверки и юнит FE. Коммит не принят."
  fi
  chmod +x "$NOTIFY"
  "$NOTIFY" --kind gate --title "проверки перед коммитом" --status failed --revision "$REVISION" --body "$BODY" || true
fi

exit "$CODE"
