#!/usr/bin/env bash
# Resolve a local Go toolchain matching vdp/.go-version (major.minor).
# Prints absolute path to that toolchain's bin directory, or nothing if none found.
# Used by Makefile and check-env-parity so a newer default Go (e.g. 1.25) does not
# block commits when Go 1.22.x is already installed under ~/sdk or brew.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VDP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PIN_FILE="$VDP_ROOT/.go-version"

if [ ! -f "$PIN_FILE" ]; then
  exit 0
fi

WANT="$(tr -d '[:space:]' < "$PIN_FILE")"
if [ -z "$WANT" ]; then
  exit 0
fi

major_minor() {
  echo "$1" | sed -E 's/.*go([0-9]+\.[0-9]+).*/\1/'
}

emit_if_match() {
  local bin="$1"
  if [ -x "$bin" ]; then
    local ver
    ver="$("$bin" version 2>/dev/null || true)"
    if [ "$(major_minor "$ver")" = "$WANT" ]; then
      dirname "$bin"
      return 0
    fi
  fi
  return 1
}

# 1) Already-correct go on PATH
if command -v go >/dev/null 2>&1; then
  if emit_if_match "$(command -v go)"; then
    exit 0
  fi
fi

# 2) ~/sdk/go1.22* (golang.org/dl download target)
if [ -d "${HOME}/sdk" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    if emit_if_match "$dir/bin/go"; then
      exit 0
    fi
  done < <(ls -1d "${HOME}/sdk/go${WANT}"* 2>/dev/null | sort -V -r || true)
fi

# 3) golang.org/dl helpers on PATH (go1.22.12) → their GOROOT
while IFS= read -r helper; do
  [ -z "$helper" ] && continue
  helper_path="$(command -v "$helper" 2>/dev/null || true)"
  [ -z "$helper_path" ] && continue
  root="$("$helper_path" env GOROOT 2>/dev/null || true)"
  if [ -n "$root" ] && emit_if_match "$root/bin/go"; then
    exit 0
  fi
done < <(compgen -c "go${WANT}." 2>/dev/null | sort -V -r || true)

# 4) Homebrew go@1.22
if command -v brew >/dev/null 2>&1; then
  brew_prefix="$(brew --prefix "go@${WANT}" 2>/dev/null || true)"
  if [ -n "$brew_prefix" ] && emit_if_match "$brew_prefix/bin/go"; then
    exit 0
  fi
fi

# 5) gvm
if [ -d "${HOME}/.gvm/gos" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    if emit_if_match "$dir/bin/go"; then
      exit 0
    fi
  done < <(ls -1d "${HOME}/.gvm/gos/go${WANT}"* 2>/dev/null | sort -V -r || true)
fi

exit 0
