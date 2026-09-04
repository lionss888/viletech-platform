#!/usr/bin/env bash
# Unit tests for ops/uptime-check.sh (no network).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/ops/uptime-check.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

out="$(UPTIME_ENV_FILE="$TMP/missing.env" UPTIME_STATE_FILE="$TMP/state" bash "$SCRIPT")"
echo "$out" | grep -q 'skip (missing' || fail "expected soft skip when env file missing"

write_curl_down() {
  cat >"$TMP/curl" <<EOF
#!/bin/sh
for a in "\$@"; do
  case "\$a" in
    *api.telegram.org*)
      echo sent >>"$TMP/tg.log"
      echo '{"ok":true}'
      exit 0
      ;;
    */login)
      printf '200'
      exit 0
      ;;
    */api/v1/health)
      printf '502'
      exit 0
      ;;
  esac
done
printf '000'
exit 0
EOF
  chmod +x "$TMP/curl"
}

write_curl_up() {
  cat >"$TMP/curl" <<EOF
#!/bin/sh
for a in "\$@"; do
  case "\$a" in
    *api.telegram.org*)
      echo sent >>"$TMP/tg.log"
      echo '{"ok":true}'
      exit 0
      ;;
    */login|*/api/v1/health)
      printf '200'
      exit 0
      ;;
  esac
done
printf '000'
exit 0
EOF
  chmod +x "$TMP/curl"
}

cat >"$TMP/uptime.env" <<EOF
UPTIME_BOT_TOKEN=test-token
UPTIME_CHAT_ID=-100123
UPTIME_BASE_URL=https://example.test
EOF

write_curl_down
: >"$TMP/tg.log"
PATH="$TMP:$PATH" \
  UPTIME_ENV_FILE="$TMP/uptime.env" \
  UPTIME_STATE_FILE="$TMP/state" \
  bash "$SCRIPT" >/dev/null
[ "$(cat "$TMP/state")" = down ] || fail "expected state=down after 502"
[ -s "$TMP/tg.log" ] || fail "expected telegram send on transition to down"

: >"$TMP/tg.log"
PATH="$TMP:$PATH" \
  UPTIME_ENV_FILE="$TMP/uptime.env" \
  UPTIME_STATE_FILE="$TMP/state" \
  bash "$SCRIPT" >/dev/null
[ ! -s "$TMP/tg.log" ] || fail "should not re-alert while still down"

write_curl_up
: >"$TMP/tg.log"
PATH="$TMP:$PATH" \
  UPTIME_ENV_FILE="$TMP/uptime.env" \
  UPTIME_STATE_FILE="$TMP/state" \
  bash "$SCRIPT" >/dev/null
[ "$(cat "$TMP/state")" = up ] || fail "expected state=up after recovery"
[ -s "$TMP/tg.log" ] || fail "expected recovery telegram"

echo "uptime-check tests ok"
