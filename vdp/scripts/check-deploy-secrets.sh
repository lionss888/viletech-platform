#!/usr/bin/env bash
# Check management notify secrets required for deploy (local pre-push gate).
# Exit 0 if secrets are configured; exit 1 with helpful message if missing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Source env files (same fallback chain as notify-mgmt.sh)
if [ -n "${MGMT_NOTIFY_ENV_FILE:-}" ]; then
  ENV_FILE="$MGMT_NOTIFY_ENV_FILE"
elif [ -f "${HOME}/.vedy_bot/env" ]; then
  ENV_FILE="${HOME}/.vedy_bot/env"
else
  ENV_FILE="${HOME}/.vdp-intake/env"
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

TOKEN="${MGMT_NOTIFY_TOKEN:-${TELEGRAM_INTAKE_TOKEN:-${UPTIME_BOT_TOKEN:-}}}"
CHAT="${MGMT_NOTIFY_CHAT_ID:-${MGMT_NOTIFY_CHAT_IDS:-${TELEGRAM_INTAKE_CHAT_IDS:-}}}"

# Try ~/.vedy_bot/remind_chat_id first, fall back to ~/.vdp-intake/remind_chat_id
if [ -z "$CHAT" ] && [ -f "${HOME}/.vedy_bot/remind_chat_id" ]; then
  CHAT="$(tr -d '[:space:]' <"${HOME}/.vedy_bot/remind_chat_id")"
elif [ -z "$CHAT" ] && [ -f "${HOME}/.vdp-intake/remind_chat_id" ]; then
  CHAT="$(tr -d '[:space:]' <"${HOME}/.vdp-intake/remind_chat_id")"
fi
CHAT="${CHAT:-${UPTIME_CHAT_ID:-}}"
CHAT="${CHAT%%,*}"

if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  cat >&2 <<EOF
❌ Management notify secrets missing (required for deploy)

Deploy workflows (GitHub Actions / GitLab CI) require MGMT_NOTIFY_TOKEN + MGMT_NOTIFY_CHAT_ID
to send deployment status notifications. Without these, deploy jobs will fail at runtime.

Fix (choose one):

1. Add to your environment file:
   echo "MGMT_NOTIFY_TOKEN=your_bot_token" >> ~/.vedy_bot/env
   echo "MGMT_NOTIFY_CHAT_ID=your_chat_id" >> ~/.vedy_bot/env

2. Or use intake aliases:
   echo "TELEGRAM_INTAKE_TOKEN=your_bot_token" >> ~/.vdp-intake/env
   echo "TELEGRAM_INTAKE_CHAT_IDS=your_chat_id" >> ~/.vdp-intake/env

3. Or set in shell session:
   export MGMT_NOTIFY_TOKEN="your_bot_token"
   export MGMT_NOTIFY_CHAT_ID="your_chat_id"

4. Configure GitHub Secrets (for CI):
   Repository Settings → Secrets → Actions → New repository secret
   - Name: MGMT_NOTIFY_TOKEN, Value: <bot_token>
   - Name: MGMT_NOTIFY_CHAT_ID, Value: <chat_id>

5. Configure GitLab CI Variables (for CI):
   Project Settings → CI/CD → Variables → Add variable
   - Key: MGMT_NOTIFY_TOKEN, Value: <bot_token>, Protected: yes
   - Key: MGMT_NOTIFY_CHAT_ID, Value: <chat_id>, Protected: yes

Current status:
  TOKEN: ${TOKEN:+configured}${TOKEN:-MISSING}
  CHAT:  ${CHAT:+configured}${CHAT:-MISSING}
  Env file: ${ENV_FILE}${ENV_FILE:+ ($([ -f "$ENV_FILE" ] && echo exists || echo missing))}

TG bot setup: https://t.me/BotFather → /newbot → copy token
Get chat_id: send message to bot → curl https://api.telegram.org/bot<TOKEN>/getUpdates
EOF
  exit 1
fi

echo "✅ Management notify secrets configured (token: ${TOKEN:0:10}..., chat: ${CHAT})"
exit 0
