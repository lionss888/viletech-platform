#!/usr/bin/env bash
# Probe public alpha endpoints; alert Telegram when down, and once when recovered.
#
# Secrets file (0600): /opt/vdp/.env.uptime
#   UPTIME_BOT_TOKEN=...   # @vdp_uptime_bot from BotFather
#   UPTIME_CHAT_ID=...     # group chat id (negative for groups)
#
# Optional:
#   UPTIME_BASE_URL=https://alpha.vedy.io
#   UPTIME_STATE_FILE=/var/lib/vdp-uptime/state
set -euo pipefail

ENV_FILE="${UPTIME_ENV_FILE:-/opt/vdp/.env.uptime}"
STATE_FILE="${UPTIME_STATE_FILE:-/var/lib/vdp-uptime/state}"
BASE_URL="${UPTIME_BASE_URL:-https://alpha.vedy.io}"
CURL_MAX="${UPTIME_CURL_MAX:-15}"

if [ ! -f "$ENV_FILE" ]; then
  echo "uptime-check: skip (missing ${ENV_FILE}; copy ops/uptime.env.example)"
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -z "${UPTIME_BOT_TOKEN:-}" ] || [ -z "${UPTIME_CHAT_ID:-}" ]; then
  echo "uptime-check: skip (UPTIME_BOT_TOKEN / UPTIME_CHAT_ID empty in ${ENV_FILE})"
  exit 0
fi

mkdir -p "$(dirname "$STATE_FILE")"
prev="$(cat "$STATE_FILE" 2>/dev/null || echo unknown)"

check_ok() {
  local path="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$CURL_MAX" "${BASE_URL}${path}" || echo 000)"
  case "$code" in
    200|204) return 0 ;;
    *) return 1 ;;
  esac
}

send_telegram() {
  local text="$1"
  curl -sS --max-time 20 \
    -X POST "https://api.telegram.org/bot${UPTIME_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${UPTIME_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "disable_web_page_preview=true" \
    >/dev/null
}

login_ok=0
api_ok=0
check_ok /login && login_ok=1
check_ok /api/v1/health && api_ok=1

if [ "$login_ok" -eq 1 ] && [ "$api_ok" -eq 1 ]; then
  now=up
else
  now=down
fi

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
detail="login=$login_ok api=$api_ok host=${BASE_URL} at=${ts}"

if [ "$now" = down ] && [ "$prev" != down ]; then
  send_telegram "🔴 VDP down: ${detail}"
elif [ "$now" = up ] && [ "$prev" = down ]; then
  send_telegram "🟢 VDP recovered: ${detail}"
fi

printf '%s\n' "$now" >"$STATE_FILE"
echo "$detail status=$now prev=$prev"
