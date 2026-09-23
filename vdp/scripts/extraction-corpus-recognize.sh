#!/usr/bin/env bash
# Batch corpus recognize via extraction PRIMARY (docling pilot or yandex). Loads vdp/.env; never prints keys.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BASE="${EXTRACTION_SMOKE_URL:-http://127.0.0.1:8093}"

echo "== health =="
HEALTH_JSON="$(curl -sf "$BASE/health")" || {
  echo "FAIL: extraction not healthy at $BASE" >&2
  exit 2
}
echo "$HEALTH_JSON"
PRIMARY="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('primary',''))" <<<"$HEALTH_JSON")"
echo "primary=$PRIMARY"

if [[ "$PRIMARY" == "yandex" ]]; then
  if [[ -z "${YANDEX_API_KEY:-}" || -z "${YANDEX_FOLDER_ID:-}" ]]; then
    echo "FAIL: YANDEX_API_KEY and/or YANDEX_FOLDER_ID unset — refuse fixture recognize" >&2
    exit 2
  fi
elif [[ "$PRIMARY" != "docling" ]]; then
  echo "FAIL: unsupported extraction primary=$PRIMARY (want docling|yandex)" >&2
  exit 2
fi

OUT_DIR="${CORPUS_OUT_DIR:-}"
EXTRA_ARGS=(--primary "$PRIMARY")
if [[ -n "$OUT_DIR" ]]; then
  EXTRA_ARGS+=(--out-dir "$OUT_DIR")
fi
if [[ -n "${CORPUS_LIMIT:-}" ]]; then
  EXTRA_ARGS+=(--limit "$CORPUS_LIMIT")
fi
if [[ -n "${CORPUS_THROTTLE:-}" ]]; then
  EXTRA_ARGS+=(--throttle "$CORPUS_THROTTLE")
fi
if [[ -n "${CORPUS_TIMEOUT:-}" ]]; then
  EXTRA_ARGS+=(--timeout "$CORPUS_TIMEOUT")
fi

exec python3 "$ROOT/scripts/extraction-corpus-recognize.py" \
  --base-url "$BASE" \
  "${EXTRA_ARGS[@]}" \
  "$@"
