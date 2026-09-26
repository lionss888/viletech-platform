#!/usr/bin/env bash
# Verify local QG wiring on this Mac (does not run full make test).
set -euo pipefail

COMBAIN_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$COMBAIN_DIR/../.." && pwd)"
FAIL=0

ok() { echo "OK  $*"; }
bad() { echo "FAIL $*"; FAIL=1; }

echo "Repo: $REPO_ROOT"

HOOKS_PATH="$(git -C "$REPO_ROOT" config --get core.hooksPath || true)"
if [ -z "$HOOKS_PATH" ]; then
  bad "core.hooksPath not set — run apply-macos.sh"
else
  ok "core.hooksPath=$HOOKS_PATH"
fi

for h in pre-commit pre-push post-commit post-merge; do
  if [ -x "$REPO_ROOT/.githooks/$h" ]; then
    ok ".githooks/$h executable"
  else
    bad ".githooks/$h missing or not executable"
  fi
done

EXPECTED_NODE="$(tr -d '[:space:]' <"$REPO_ROOT/vdp/fe/.nvmrc")"
# Prefer resolve-pinned-node (same as Makefile / GUI wrappers) before bare PATH.
PINNED_NODE_BIN=""
if [ -x "$REPO_ROOT/vdp/scripts/resolve-pinned-node.sh" ]; then
  PINNED_NODE_BIN="$("$REPO_ROOT/vdp/scripts/resolve-pinned-node.sh" 2>/dev/null || true)"
fi
if [ -n "$PINNED_NODE_BIN" ]; then
  export PATH="${PINNED_NODE_BIN}:${PATH}"
fi
if command -v node >/dev/null 2>&1; then
  GOT="$(node --version | sed 's/^v//')"
  if [ "$GOT" = "$EXPECTED_NODE" ]; then
    ok "node $GOT (= .nvmrc${PINNED_NODE_BIN:+ via pinned bin})"
  else
    bad "node $GOT ≠ .nvmrc $EXPECTED_NODE"
  fi
else
  bad "node not on PATH (install $EXPECTED_NODE or run apply-macos.sh --gui-wrappers)"
fi

if command -v go >/dev/null 2>&1; then
  ok "go $(go version | awk '{print $3}')"
else
  bad "go not on PATH"
fi

if command -v make >/dev/null 2>&1; then
  ok "make present"
else
  bad "make not on PATH"
fi

if [ -f "${HOME}/.vedy_bot/env" ] || [ -f "${HOME}/.vdp-intake/env" ]; then
  ok "mgmt notify env file present (pre-commit fail notify / deploy secrets)"
else
  echo "WARN ~/.vedy_bot/env missing — gate still runs; TG on fail skips. Optional: apply --with-notify-env"
fi

echo ""
echo "Running check-env-parity..."
if "$REPO_ROOT/vdp/scripts/check-env-parity.sh"; then
  ok "check-env-parity"
else
  bad "check-env-parity"
fi

echo ""
echo "Running docs-format-check..."
if make -C "$REPO_ROOT/vdp" docs-format-check; then
  ok "docs-format-check"
else
  bad "docs-format-check"
fi

echo ""
if [ "$FAIL" -ne 0 ]; then
  echo "verify: FAILED — fix above, then retry commit"
  exit 1
fi
echo "verify: PASSED — Commit (CLI / GitHub Desktop / Cursor) should hit local QG"
echo "Full pre-commit simulation: make -C vdp precommit-gate"
exit 0
