#!/usr/bin/env bash
# Resolve a local Node.js matching vdp/fe/.nvmrc (exact version string).
# Prints absolute path to that toolchain's bin directory, or nothing if none found.
# Used by Makefile and check-env-parity so GUI git clients (GitHub Desktop) that
# lack nvm/mise on PATH still pass precommit when Node is installed under known homes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VDP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PIN_FILE="$VDP_ROOT/fe/.nvmrc"

if [ ! -f "$PIN_FILE" ]; then
  exit 0
fi

WANT="$(tr -d '[:space:]' < "$PIN_FILE")"
if [ -z "$WANT" ]; then
  exit 0
fi

node_version() {
  local bin="$1"
  "$bin" --version 2>/dev/null | sed 's/^v//' | tr -d '[:space:]'
}

emit_if_match() {
  local bin="$1"
  if [ -x "$bin" ]; then
    local ver
    ver="$(node_version "$bin")"
    if [ "$ver" = "$WANT" ]; then
      dirname "$bin"
      return 0
    fi
  fi
  return 1
}

# 1) Already-correct node on PATH
if command -v node >/dev/null 2>&1; then
  if emit_if_match "$(command -v node)"; then
    exit 0
  fi
fi

# 2) ~/.local/node/node-v22.17.0-* (manual / portable installs)
if [ -d "${HOME}/.local/node" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    if emit_if_match "$dir/bin/node"; then
      exit 0
    fi
  done < <(ls -1d "${HOME}/.local/node/node-v${WANT}"* 2>/dev/null | sort -V -r || true)
fi

# 3) nvm
if [ -d "${HOME}/.nvm/versions/node" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    if emit_if_match "$dir/bin/node"; then
      exit 0
    fi
  done < <(ls -1d "${HOME}/.nvm/versions/node/v${WANT}"* 2>/dev/null | sort -V -r || true)
fi

# 4) fnm
if [ -d "${HOME}/.fnm/node-versions" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    if emit_if_match "$dir/installation/bin/node" || emit_if_match "$dir/bin/node"; then
      exit 0
    fi
  done < <(ls -1d "${HOME}/.fnm/node-versions/v${WANT}"* 2>/dev/null | sort -V -r || true)
fi

# 5) volta
if [ -x "${HOME}/.volta/bin/node" ]; then
  if emit_if_match "${HOME}/.volta/bin/node"; then
    exit 0
  fi
fi

# 6) mise shims / installs
if [ -x "${HOME}/.local/share/mise/shims/node" ]; then
  if emit_if_match "${HOME}/.local/share/mise/shims/node"; then
    exit 0
  fi
fi
if [ -d "${HOME}/.local/share/mise/installs/node" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    if emit_if_match "$dir/bin/node"; then
      exit 0
    fi
  done < <(ls -1d "${HOME}/.local/share/mise/installs/node/${WANT}"* 2>/dev/null | sort -V -r || true)
fi

# 7) Homebrew node@22 / node
if command -v brew >/dev/null 2>&1; then
  major="${WANT%%.*}"
  for formula in "node@${major}" node; do
    brew_prefix="$(brew --prefix "$formula" 2>/dev/null || true)"
    if [ -n "$brew_prefix" ] && emit_if_match "$brew_prefix/bin/node"; then
      exit 0
    fi
  done
fi

# 8) Common fixed paths (GUI apps often only see /usr/local/bin)
for bin in /usr/local/bin/node /opt/homebrew/bin/node; do
  if emit_if_match "$bin"; then
    exit 0
  fi
done

exit 0
