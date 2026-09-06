#!/usr/bin/env bash
# Roll back release deploy to previous pin file on remote host. No docker build.
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOY_HOST="${DEPLOY_HOST:?set DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
PREVIOUS_PIN="${PREVIOUS_PIN:-}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes)
if [ -n "$SSH_KEY_PATH" ]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.release.yml"

REMOTE_CMD=$(cat <<'EOS'
set -euo pipefail
cd "$DEPLOY_PATH"

PIN="${PREVIOUS_PIN:-}"
if [ -z "$PIN" ]; then
  PIN=".release-images.${ENVIRONMENT}.last-good"
fi
if [ ! -f "$PIN" ]; then
  echo "rollback pin not found: $PIN" >&2
  exit 1
fi

cp "$PIN" .release-images.env
set -a
# shellcheck disable=SC1091
source .env.deploy
# shellcheck disable=SC1091
source .release-images.env
set +a
export ENVIRONMENT
export COMPOSE_FILES

chmod +x scripts/*.sh || true
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES --profile prod pull hub core fe-prod
if [ -x ./scripts/vdp-compose-up.sh ]; then
  ./scripts/vdp-compose-up.sh
else
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES --profile prod up -d --no-build postgres-core postgres-hub
  ./scripts/compose-db-migrate.sh
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES --profile prod up -d --no-build --scale fe=0
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES --profile prod restart core hub
  ./scripts/wait-release-health.sh
fi
echo "rollback $ENVIRONMENT ok (tag=${IMAGE_TAG:-unknown})"
EOS
)

ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "DEPLOY_PATH='${DEPLOY_PATH}' ENVIRONMENT='${ENVIRONMENT}' COMPOSE_FILES='${COMPOSE_FILES}' \
   PREVIOUS_PIN='${PREVIOUS_PIN}' bash -s" <<< "$REMOTE_CMD"
