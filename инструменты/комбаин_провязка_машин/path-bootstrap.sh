#!/usr/bin/env bash
# Bootstrap PATH for git hooks launched from GUI (GitHub Desktop, Cursor Commit UI).
# Sourced by wrappers under ~/.vdp-machine/hooks — do not put secrets here.
set -euo pipefail

# Homebrew (Apple Silicon then Intel)
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

# Common fixed locations
export PATH="/usr/local/go/bin:/usr/local/bin:/opt/homebrew/bin:${PATH:-}"

# nvm (if installed; GUI often misses this)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

# mise
if [ -x "$HOME/.local/bin/mise" ]; then
  eval "$("$HOME/.local/bin/mise" activate bash)"
elif command -v mise >/dev/null 2>&1; then
  eval "$(mise activate bash)"
fi

# Prefer Node from nvm/.nvmrc when available (repo-relative caller sets VDP_REPO_ROOT)
if [ -n "${VDP_REPO_ROOT:-}" ] && [ -f "$VDP_REPO_ROOT/vdp/fe/.nvmrc" ] && command -v nvm >/dev/null 2>&1; then
  nvm use --silent "$(tr -d '[:space:]' <"$VDP_REPO_ROOT/vdp/fe/.nvmrc")" >/dev/null 2>&1 || true
fi
