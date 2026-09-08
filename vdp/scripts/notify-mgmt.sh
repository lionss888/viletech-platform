#!/usr/bin/env bash
# Send a management Telegram notification (product + tech, no tool brand names).
#
# Secrets (first match wins for token / chat):
#   MGMT_NOTIFY_TOKEN | TELEGRAM_INTAKE_TOKEN | UPTIME_BOT_TOKEN
#   MGMT_NOTIFY_CHAT_ID | TELEGRAM_INTAKE_CHAT_IDS | ~/.vdp-intake/remind_chat_id | UPTIME_CHAT_ID
# Optional env file: MGMT_NOTIFY_ENV_FILE (default ~/.vdp-intake/env)
#
# Usage:
#   ./scripts/notify-mgmt.sh --kind done --title "UX кабинетов" --body $'строка1\nстрока2'
#   ./scripts/notify-mgmt.sh --kind promote --env alpha --status success --revision sha-abc
#   ./scripts/notify-mgmt.sh --kind uptime --env alpha --status down
#   echo "text" | ./scripts/notify-mgmt.sh --kind raw
#   ./scripts/notify-mgmt.sh --dry-run --kind gate --title "Стабильность" --status passed
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SANITIZE="$ROOT/scripts/mgmt-notify-sanitize.py"
DRY_RUN=0
KIND=""
TITLE=""
BODY=""
STATUS=""
ENV_NAME=""
REVISION=""
NEXT=""

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --kind) KIND="${2:-}"; shift 2 ;;
    --title) TITLE="${2:-}"; shift 2 ;;
    --body) BODY="${2:-}"; shift 2 ;;
    --status) STATUS="${2:-}"; shift 2 ;;
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --revision) REVISION="${2:-}"; shift 2 ;;
    --next) NEXT="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done

[ -n "$KIND" ] || { echo "notify-mgmt: --kind required" >&2; exit 2; }

if [ "$KIND" = raw ] && [ -z "$BODY" ]; then
  BODY="$(cat)"
fi

build_text() {
  case "$KIND" in
    done)
      printf '%s\n' "✅ Готово · ${TITLE:-волна}"
      [ -n "$BODY" ] && printf '\n%s\n' "$BODY"
      [ -n "$STATUS" ] && printf '\nПриёмка: %s\n' "$STATUS"
      [ -n "$NEXT" ] && printf 'Дальше: %s\n' "$NEXT"
      ;;
    progress)
      printf '%s\n' "🟡 На проверке · ${TITLE:-волна}"
      [ -n "$BODY" ] && printf '\n%s\n' "$BODY"
      [ -n "$NEXT" ] && printf '\nНужно: %s\n' "$NEXT"
      ;;
    gate)
      printf '%s\n' "⚙️ Приёмка · ${TITLE:-контур}"
      case "${STATUS:-}" in
        passed|ok|success) printf '\nПроверки: пройдены\n' ;;
        failed|fail|error) printf '\nПроверки: не пройдены\n' ;;
        *) [ -n "$STATUS" ] && printf '\nСтатус: %s\n' "$STATUS" ;;
      esac
      [ -n "$BODY" ] && printf '%s\n' "$BODY"
      ;;
    promote)
      env_l="${ENV_NAME:-среда}"
      case "${STATUS:-}" in
        success|ok|passed)
          printf '%s\n' "🚀 Выкат · ${env_l}"
          printf '\nСтатус: успех\n'
          ;;
        *)
          printf '%s\n' "⚠️ Выкат · ${env_l}"
          printf '\nСтатус: сбой\n'
          ;;
      esac
      [ -n "$REVISION" ] && printf 'Ревизия: %s\n' "$REVISION"
      [ -n "$BODY" ] && printf '%s\n' "$BODY"
      ;;
    uptime)
      env_l="${ENV_NAME:-среда}"
      case "${STATUS:-}" in
        up|recovered)
          printf '%s\n' "🟢 Среда восстановлена · ${env_l}"
          printf 'Вход и API снова доступны.\n'
          ;;
        *)
          printf '%s\n' "🔴 Среда недоступна · ${env_l}"
          printf 'Вход или API не отвечают. Разбор начат.\n'
          ;;
      esac
      [ -n "$BODY" ] && printf '%s\n' "$BODY"
      ;;
    blocker)
      printf '%s\n' "⛔ Блокер · ${TITLE:-задача}"
      [ -n "$BODY" ] && printf '\n%s\n' "$BODY"
      [ -n "$NEXT" ] && printf '\nНужно: %s\n' "$NEXT"
      ;;
    schedule)
      printf '%s\n' "📌 В график · ${TITLE:-задача}"
      [ -n "$BODY" ] && printf '\n%s\n' "$BODY"
      [ -n "$NEXT" ] && printf '\nСрок / статус: %s\n' "$NEXT"
      ;;
    raw)
      printf '%s\n' "$BODY"
      ;;
    *)
      echo "notify-mgmt: unknown kind '$KIND'" >&2
      exit 2
      ;;
  esac
}

TEXT="$(build_text)"
TEXT="$(printf '%s' "$TEXT" | python3 "$SANITIZE")"
if ! printf '%s' "$TEXT" | python3 "$SANITIZE" --check >/dev/null; then
  echo "notify-mgmt: sanitizer left banned tokens" >&2
  exit 1
fi

if [ "$DRY_RUN" = 1 ]; then
  printf '%s\n' "$TEXT"
  exit 0
fi

ENV_FILE="${MGMT_NOTIFY_ENV_FILE:-${HOME}/.vdp-intake/env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

TOKEN="${MGMT_NOTIFY_TOKEN:-${TELEGRAM_INTAKE_TOKEN:-${UPTIME_BOT_TOKEN:-}}}"
CHAT="${MGMT_NOTIFY_CHAT_ID:-${TELEGRAM_INTAKE_CHAT_IDS:-}}"
if [ -z "$CHAT" ] && [ -f "${HOME}/.vdp-intake/remind_chat_id" ]; then
  CHAT="$(tr -d '[:space:]' <"${HOME}/.vdp-intake/remind_chat_id")"
fi
CHAT="${CHAT:-${UPTIME_CHAT_ID:-}}"
# Take first id if comma-separated
CHAT="${CHAT%%,*}"

if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  echo "notify-mgmt: skip (token/chat not configured)" >&2
  exit 0
fi

RESP="$(curl -sS --max-time 20 \
  -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${CHAT}" \
  --data-urlencode "text=${TEXT}" \
  --data-urlencode "disable_web_page_preview=true")"

ok="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print("1" if d.get("ok") else "0")' "$RESP")"
if [ "$ok" != 1 ]; then
  echo "notify-mgmt: telegram error" >&2
  echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("description","")[:200])' >&2 || true
  exit 1
fi

MSG_ID="$(python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print((d.get("result") or {}).get("message_id",""))' "$RESP")"
LOG_DIR="${MGMT_NOTIFY_LOG_DIR:-${HOME}/.vdp-intake}"
mkdir -p "$LOG_DIR"
printf '%s kind=%s message_id=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$KIND" "$MSG_ID" >>"$LOG_DIR/notify-mgmt.log"
echo "notify-mgmt: ok message_id=${MSG_ID}"
