#!/usr/bin/env bash
# Bring up the release compose stack from /opt/vdp (or DEPLOY_PATH).
# Used by systemd after reboot/preemptible thaw so the full app returns without manual steps.
# Order mirrors local make compose-up: postgres → migrate → stack → restart core/hub → health.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
cd "$DEPLOY_PATH"

if [ ! -f .env.deploy ]; then
  echo "missing ${DEPLOY_PATH}/.env.deploy" >&2
  exit 1
fi
if [ ! -f .release-images.env ]; then
  echo "missing ${DEPLOY_PATH}/.release-images.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.deploy
# shellcheck disable=SC1091
source .release-images.env
set +a

COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.release.yml}"
export COMPOSE_FILES
# shellcheck disable=SC2086
dc() {
  docker compose ${COMPOSE_FILES} "$@"
}

PROFILES=(--profile prod)
if [ -n "${VDP_MAIL_IMAGE:-}" ] || [ -n "${VDP_SMS_IMAGE:-}" ]; then
  PROFILES+=(--profile gateways)
fi

dc "${PROFILES[@]}" up -d --no-build postgres-core postgres-hub
chmod +x ./scripts/compose-db-migrate.sh
./scripts/compose-db-migrate.sh

dc "${PROFILES[@]}" up -d --no-build --scale fe=0
dc "${PROFILES[@]}" restart core hub

if [ -x ./scripts/wait-release-health.sh ]; then
  ./scripts/wait-release-health.sh
fi
