#!/usr/bin/env bash
# Idempotent: pull OLLAMA_MODEL only if missing. Never part of compose-up / rebuild.
set -euo pipefail

MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama CLI not found. Install from https://ollama.com then re-run." >&2
  exit 1
fi

if ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "$MODEL"; then
  echo "ok: $MODEL already present (no download)"
  exit 0
fi

echo "pulling $MODEL once into local Ollama store..."
ollama pull "$MODEL"
echo "ok: $MODEL ready"
