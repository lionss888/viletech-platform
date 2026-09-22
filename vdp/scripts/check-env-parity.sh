#!/usr/bin/env bash
# Environment parity check: ensure local environment matches CI requirements.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Checking environment parity..."

# Prefer a toolchain matching vdp/.go-version (e.g. ~/sdk/go1.22.12) over a newer default Go.
PINNED_GO_BIN="$(./vdp/scripts/resolve-pinned-go.sh 2>/dev/null || true)"
if [ -n "${PINNED_GO_BIN:-}" ]; then
  export PATH="${PINNED_GO_BIN}:${PATH}"
  if [ -d "${PINNED_GO_BIN}/../" ]; then
    export GOROOT="$(cd "${PINNED_GO_BIN}/.." && pwd)"
  fi
  echo "Using pinned Go from ${PINNED_GO_BIN}"
fi

# Check Node.js version matches .nvmrc
if [ -f vdp/fe/.nvmrc ]; then
  NVMRC_VERSION=$(tr -d '[:space:]' < vdp/fe/.nvmrc)
  NODE_VERSION=$(node --version | sed 's/v//' | tr -d '[:space:]')

  if [ "$NODE_VERSION" != "$NVMRC_VERSION" ]; then
    echo "Node.js version mismatch:"
    echo "   Local:  $NODE_VERSION"
    echo "   .nvmrc: $NVMRC_VERSION"
    echo ""
    echo "Fix: nvm install $NVMRC_VERSION && nvm use $NVMRC_VERSION"
    echo "Or:  mise use node@$NVMRC_VERSION"
    exit 1
  fi
  echo "Node.js version: $NODE_VERSION (matches .nvmrc)"
else
  echo "Warning: vdp/fe/.nvmrc not found"
fi

# Check Go major.minor matches vdp/.go-version (CI reads the same pin into setup-go)
GO_VERSION_FILE="vdp/.go-version"
if [ -f "$GO_VERSION_FILE" ]; then
  GO_WANT=$(tr -d '[:space:]' < "$GO_VERSION_FILE")
  if ! command -v go >/dev/null 2>&1; then
    echo "Go is not installed or not on PATH"
    echo "   Required: $GO_WANT (see $GO_VERSION_FILE)"
    echo "Fix: install Go $GO_WANT from https://go.dev/dl/ or gvm use go$GO_WANT"
    echo "Or:  go install golang.org/dl/go${GO_WANT}.0@latest  # then go${GO_WANT}.0 download (use a real patch)"
    exit 1
  fi
  # go version → "go version go1.22.12 darwin/amd64" → major.minor "1.22"
  GO_HAVE=$(go version | sed -E 's/.*go([0-9]+\.[0-9]+).*/\1/')
  if [ -z "$GO_HAVE" ] || [ "$GO_HAVE" = "$(go version)" ]; then
    echo "Could not parse Go version from: $(go version)"
    exit 1
  fi
  if [ "$GO_HAVE" != "$GO_WANT" ]; then
    echo "Go version mismatch:"
    echo "   Local:       $GO_HAVE ($(go version))"
    echo "   .go-version: $GO_WANT"
    echo ""
    echo "Fix: install Go $GO_WANT.x (gates auto-use ~/sdk/go${GO_WANT}.* when present)"
    echo "  Example: go install golang.org/dl/go${GO_WANT}.12@latest && go${GO_WANT}.12 download"
    echo "Or:  gvm install go$GO_WANT && gvm use go$GO_WANT --default"
    echo "CI reads the same pin from vdp/.go-version into setup-go."
    exit 1
  fi
  echo "Go version: $GO_HAVE (matches .go-version)"
else
  echo "Warning: $GO_VERSION_FILE not found"
fi

# Check package-lock.json exists
if [ ! -f vdp/fe/package-lock.json ]; then
  echo "vdp/fe/package-lock.json missing"
  echo "Fix: cd vdp/fe && npm install"
  exit 1
fi
echo "package-lock.json exists"

# Check package-lock.json is not modified (contains local file:// deps)
if grep -q '"file:' vdp/fe/package-lock.json 2>/dev/null; then
  echo "package-lock.json contains local file:// dependencies"
  echo "Fix: remove file:// deps from package.json, run npm install"
  exit 1
fi

echo "Environment parity check passed"
