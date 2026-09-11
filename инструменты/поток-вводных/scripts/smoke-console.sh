#!/usr/bin/env bash
# Local smoke: Nitro SPA + Go console on :8787 (no Docker required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE_OUT="$ROOT/fe/.output"
TOKEN="${INTAKE_CONSOLE_TOKEN:-smoke-token}"
SPA_PORT="${INTAKE_SPA_PORT:-3011}"
CONSOLE_ADDR="${INTAKE_CONSOLE_ADDR:-127.0.0.1:8791}"

if [[ ! -f "$FE_OUT/server/index.mjs" ]]; then
  echo "missing $FE_OUT/server/index.mjs — run: make fe-build" >&2
  exit 1
fi

cleanup() {
  [[ -n "${NITRO_PID:-}" ]] && kill "$NITRO_PID" 2>/dev/null || true
  [[ -n "${GO_PID:-}" ]] && kill "$GO_PID" 2>/dev/null || true
}
trap cleanup EXIT

(cd "$FE_OUT" && HOST=127.0.0.1 PORT="$SPA_PORT" NITRO_PORT="$SPA_PORT" node server/index.mjs) &
NITRO_PID=$!
sleep 1

HOME_TMP="$(mktemp -d)"
export INTAKE_HOME="$HOME_TMP"
export INTAKE_CONSOLE=1
export INTAKE_CONSOLE_TOKEN="$TOKEN"
export INTAKE_CONSOLE_ADDR="$CONSOLE_ADDR"
export INTAKE_CONSOLE_SPA_UPSTREAM="http://127.0.0.1:${SPA_PORT}"
# Minimal fake TG creds so config.Load succeeds; poller may error but console starts first.
export TELEGRAM_INTAKE_TOKEN="${TELEGRAM_INTAKE_TOKEN:-000000000:AASmokeSmokeSmokeSmokeSmokeSmokeSmoke}"
export TELEGRAM_INTAKE_CHAT_IDS="${TELEGRAM_INTAKE_CHAT_IDS:--1001}"

(cd "$ROOT" && go run ./cmd/intake -hitl) &
GO_PID=$!

ok=0
for _ in $(seq 1 40); do
  if curl -sf --max-time 2 "http://${CONSOLE_ADDR}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 0.25
done
if [[ "$ok" != 1 ]]; then
  echo "console did not become healthy on $CONSOLE_ADDR" >&2
  exit 1
fi

html="$(curl -sf --max-time 10 "http://${CONSOLE_ADDR}/")"
echo "$html" | grep -qiE 'html|script|root' || { echo "SPA HTML missing"; exit 1; }

code401="$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' "http://${CONSOLE_ADDR}/api/thread")"
[[ "$code401" == "401" ]] || { echo "want 401 without token, got $code401"; exit 1; }

code200="$(curl -sf --max-time 5 -o /tmp/intake-thread.json -w '%{http_code}' \
  -H "Authorization: Bearer ${TOKEN}" "http://${CONSOLE_ADDR}/api/thread")"
[[ "$code200" == "200" ]] || { echo "want 200 with token, got $code200"; exit 1; }

echo "smoke ok: SPA + /api/thread on http://${CONSOLE_ADDR}"
