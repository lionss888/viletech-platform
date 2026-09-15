#!/usr/bin/env bash
# Print a docker-compose snippet for deploying vedy_bot from GHCR.
# Usage: ./scripts/print-deploy-compose.sh [image-tag]
# Example: ./scripts/print-deploy-compose.sh sha-abc1234
set -euo pipefail

TAG="${1:-sha-latest}"
REGISTRY="${VEDY_BOT_REGISTRY:-ghcr.io}"
NAMESPACE="${VEDY_BOT_NAMESPACE:-$(gh api user --jq .login 2>/dev/null || echo 'your-org')}"
IMAGE="${REGISTRY}/${NAMESPACE}/vedy_bot:${TAG}"

cat << EOF
# docker-compose.vedy_bot.yml
# Generated for image: ${IMAGE}
# Save to file and run: docker compose -f docker-compose.vedy_bot.yml up -d

name: vedy_bot

services:
  vedy_bot:
    image: ${IMAGE}
    container_name: vedy_bot
    env_file:
      - \${HOME}/.vedy_bot/env
    environment:
      INTAKE_HOME: /var/lib/vedy_bot
      INTAKE_CONSOLE_ADDR: "0.0.0.0:8787"
    ports:
      - "127.0.0.1:8787:8787"
    volumes:
      - \${HOME}/.vedy_bot:/var/lib/vedy_bot
    restart: unless-stopped

# Pre-requisites:
# 1. Create ~/.vedy_bot/env with:
#    TELEGRAM_INTAKE_TOKEN=...
#    TELEGRAM_INTAKE_CHAT_IDS=-100...
#    INTAKE_CONSOLE_TOKEN=long-random
#
# 2. Pull and start:
#    docker compose -f docker-compose.vedy_bot.yml pull
#    docker compose -f docker-compose.vedy_bot.yml up -d
#
# 3. For HTTPS, use Caddy/nginx reverse proxy to 127.0.0.1:8787
EOF
