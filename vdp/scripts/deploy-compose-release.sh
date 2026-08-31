#!/usr/bin/env bash
# Deploy release stack on target host via SSH (staging/production). No docker build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOY_HOST="${DEPLOY_HOST:?set DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
PIN_FILE="${PIN_FILE:-$ROOT/.release-images.env}"

if [ ! -f "$PIN_FILE" ]; then
  echo "missing pin file: $PIN_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$PIN_FILE"

: "${VDP_CORE_IMAGE:?VDP_CORE_IMAGE required in pin file}"
: "${VDP_HUB_IMAGE:?VDP_HUB_IMAGE required in pin file}"
: "${VDP_FE_IMAGE:?VDP_FE_IMAGE required in pin file}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "$SSH_KEY_PATH" ]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.release.yml"

echo "Deploying to ${ENVIRONMENT}@${DEPLOY_HOST} path=${DEPLOY_PATH}"

# Sync compose + scripts (no secrets in repo)
rsync -az --delete \
  --exclude '.release-images.env' \
  --exclude 'fe/node_modules' \
  "$ROOT/" "${REMOTE}:${DEPLOY_PATH}/"

# Write pin + env on remote (env file must exist on host; template only here)
scp "${SSH_OPTS[@]}" "$PIN_FILE" "${REMOTE}:${DEPLOY_PATH}/.release-images.env"

REMOTE_CMD=$(cat <<'EOS'
set -euo pipefail
cd "$DEPLOY_PATH"
set -a
source .release-images.env
[ -f .env.deploy ] && source .env.deploy
set +a
export ENVIRONMENT="${ENVIRONMENT:-staging}"
docker compose $COMPOSE_FILES --profile prod pull hub core fe-prod
docker compose $COMPOSE_FILES --profile prod up -d --no-build --pull always --scale fe=0
./scripts/wait-release-health.sh
if [ "$ENVIRONMENT" = "staging" ]; then
  ./scripts/staging-smoke.sh
fi
# Save last-good pin for rollback
cp .release-images.env ".release-images.${ENVIRONMENT}.last-good"
EOS
)

ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "DEPLOY_PATH='${DEPLOY_PATH}' ENVIRONMENT='${ENVIRONMENT}' COMPOSE_FILES='${COMPOSE_FILES}' bash -s" <<< "$REMOTE_CMD"

echo "deploy ${ENVIRONMENT} ok digest tag=${IMAGE_TAG:-unknown}"
