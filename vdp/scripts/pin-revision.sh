#!/usr/bin/env bash
# Print the git revision an image pin was built from.
#
# Promote must ship compose files, scripts and migrations from the very revision
# the pinned images were built from, otherwise a pin from one ref lands next to a
# tree from another ref. A pin without a usable GIT_REVISION is a hard failure:
# guessing the default branch is what produced the hybrid alpha stand.
#
# Usage: pin-revision.sh [pin-file]   (default: $PWD/release-images.env)
set -euo pipefail

PIN_FILE="${1:-${PIN_FILE:-release-images.env}}"

if [ ! -f "$PIN_FILE" ]; then
  echo "missing pin file: $PIN_FILE" >&2
  exit 1
fi

revision=$(sed -n 's/^GIT_REVISION=//p' "$PIN_FILE" | head -n1 | tr -d '"' | tr -d "'")

if [ -z "$revision" ] || [ "$revision" = "unknown" ]; then
  echo "pin $PIN_FILE has no usable GIT_REVISION — refusing to promote a mismatched tree" >&2
  exit 1
fi

printf '%s\n' "$revision"
