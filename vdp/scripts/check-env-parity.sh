#!/usr/bin/env bash
# Environment parity check: ensure local environment matches CI requirements.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "🔍 Checking environment parity..."

# Check Node.js version matches .nvmrc
if [ -f vdp/fe/.nvmrc ]; then
  NVMRC_VERSION=$(cat vdp/fe/.nvmrc | tr -d '[:space:]')
  NODE_VERSION=$(node --version | sed 's/v//' | tr -d '[:space:]')
  
  if [ "$NODE_VERSION" != "$NVMRC_VERSION" ]; then
    echo "❌ Node.js version mismatch:"
    echo "   Local:  $NODE_VERSION"
    echo "   .nvmrc: $NVMRC_VERSION"
    echo ""
    echo "Fix: nvm install $NVMRC_VERSION && nvm use $NVMRC_VERSION"
    echo "Or:  mise use node@$NVMRC_VERSION"
    exit 1
  fi
  echo "✅ Node.js version: $NODE_VERSION (matches .nvmrc)"
else
  echo "⚠️  Warning: vdp/fe/.nvmrc not found"
fi

# Check package-lock.json exists
if [ ! -f vdp/fe/package-lock.json ]; then
  echo "❌ vdp/fe/package-lock.json missing"
  echo "Fix: cd vdp/fe && npm install"
  exit 1
fi
echo "✅ package-lock.json exists"

# Check package-lock.json is not modified (contains local file:// deps)
if grep -q '"file:' vdp/fe/package-lock.json 2>/dev/null; then
  echo "❌ package-lock.json contains local file:// dependencies"
  echo "Fix: remove file:// deps from package.json, run npm install"
  exit 1
fi

echo "✅ Environment parity check passed"
