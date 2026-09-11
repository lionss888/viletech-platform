#!/usr/bin/env bash
# Sync Lovable UI (lionss888/interface-refresh) into fe/, preserving platform API layer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE="$ROOT/fe"
REPO="${LOVABLE_INTAKE_REPO:-https://github.com/lionss888/interface-refresh.git}"
REF="${LOVABLE_INTAKE_REF:-main}"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$FE/src/lib/api"
if [[ ! -f "$FE/src/lib/api/.keep" ]]; then
  echo '// protected platform API layer — do not overwrite via fe-sync' > "$FE/src/lib/api/.keep"
fi

echo "fe-sync: cloning ${REPO}@${REF}"
git clone --depth 1 --branch "$REF" "$REPO" "$TMP/src"

rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'src/lib/api/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.example' \
  --exclude 'vite.config.ts' \
  --exclude 'dist/' \
  --exclude '.output/' \
  "$TMP/src/" "$FE/"

mkdir -p "$FE/src/lib/api"
if [[ ! -f "$FE/src/lib/api/.keep" ]]; then
  echo '// protected platform API layer — do not overwrite via fe-sync' > "$FE/src/lib/api/.keep"
fi

echo "fe-sync: done → $FE (src/lib/api preserved)"
