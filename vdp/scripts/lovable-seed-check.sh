#!/usr/bin/env bash
# Fail if vdp/fe/src/lib/ved/mock.ts drifts from lovable-vdp/dev0 (demo patches live in demo-seed-overlay.ts).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FE_MOCK="$ROOT/vdp/fe/src/lib/ved/mock.ts"
REMOTE_REF="${LOVABLE_SEED_REF:-lovable-vdp/dev0}"
if ! git -C "$ROOT" rev-parse --verify "$REMOTE_REF" >/dev/null 2>&1; then
  echo "lovable-seed-check: missing ref $REMOTE_REF (git fetch lovable-vdp)" >&2
  exit 1
fi
if ! git -C "$ROOT" cat-file -e "$REMOTE_REF:src/lib/ved/mock.ts" 2>/dev/null; then
  echo "lovable-seed-check: $REMOTE_REF has no src/lib/ved/mock.ts" >&2
  exit 1
fi
if ! diff -u <(git -C "$ROOT" show "$REMOTE_REF:src/lib/ved/mock.ts") "$FE_MOCK"; then
  echo "lovable-seed-check: mock.ts differs from $REMOTE_REF — move demo-only patches to demo-seed-overlay.ts" >&2
  exit 1
fi
echo "lovable-seed-check: mock.ts matches $REMOTE_REF ($(git -C "$ROOT" rev-parse --short "$REMOTE_REF"))"
