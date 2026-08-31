#!/usr/bin/env bash
# Roll back release deploy to previous pin file on remote host.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOY_HOST="${DEPLOY_HOST:?set DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
PREVIOUS_PIN="${PREVIOUS_PIN:-}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "$SSH_KEY_PATH" ]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.release.yml"

REMOTE_CMD=$(cat <<EOS
set -euo pipefail
cd "${DEPLOY_PATH}"
PIN="${PREVIOUS_PIN:-.release-images.${ENVIRONMENT}.last-good}"
if [ ! -f "\$PIN" ]; then
  echo "rollback pin not found: \$PIN" >&2
  exit 1
fi
cp "\$PIN" .release-images.env
set -a
source .release-images.env
[ -f .env.deploy ] && source .env.deploy
set +a
docker compose ${COMPOSE_FILES} --profile prod pull hub core fe-prod
docker compose ${COMPOSE_FILES} --profile prod up -d --no-build --pull always --scale fe=0
./scripts/wait-release-health.sh
echo "rollback ${ENVIRONMENT} ok"
EOS
)

ssh "${SSH_OPTS[@]}" "$REMOTE" bash -c "$REMOTE_CMD"
