#!/usr/bin/env bash
# Migrate legacy ~/.vdp-intake/env → ~/.vedy_bot/env (no overwrite if primary exists).
set -euo pipefail
PRIMARY="${HOME}/.vedy_bot"
LEGACY="${HOME}/.vdp-intake"
mkdir -p "$PRIMARY"
if [[ -f "${PRIMARY}/env" ]]; then
  echo "ok: ${PRIMARY}/env already exists"
  exit 0
fi
if [[ -f "${LEGACY}/env" ]]; then
  cp "${LEGACY}/env" "${PRIMARY}/env"
  chmod 600 "${PRIMARY}/env"
  echo "migrated: ${LEGACY}/env → ${PRIMARY}/env"
  exit 0
fi
cat > "${PRIMARY}/env" <<'EOF'
# vedy_bot env — fill and chmod 600
TELEGRAM_INTAKE_TOKEN=
TELEGRAM_INTAKE_CHAT_IDS=
TELEGRAM_OPERATOR_CHAT_IDS=
INTAKE_CONSOLE_TOKEN=
CURSOR_API_KEY=
INTAKE_AGENT_CLOUD=1
# P1 embeddings (OpenAI-compatible)
# INTAKE_EMBEDDING_URL=https://api.openai.com/v1
# INTAKE_EMBEDDING_API_KEY=
# INTAKE_EMBEDDING_MODEL=text-embedding-3-small
# P2/P3
# INTAKE_TG_CURSOR=0
# INTAKE_HITL_MODE=hybrid
EOF
chmod 600 "${PRIMARY}/env"
echo "created template: ${PRIMARY}/env (fill secrets)"
