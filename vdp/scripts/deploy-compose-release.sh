#!/usr/bin/env bash
# Deploy release stack on target host via SSH (staging/production). No docker build.
#
# Required: DEPLOY_HOST, pin file with VDP_*_IMAGE refs.
# Optional: DEPLOY_USER, DEPLOY_PATH, SSH_KEY_PATH, REGISTRY_USER/REGISTRY_TOKEN (registry login),
#           SKIP_SMOKE=1 to skip staging-smoke.
# Optional notify: MGMT_NOTIFY_TOKEN + MGMT_NOTIFY_CHAT_ID (promote success/fail after smoke).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOY_HOST="${DEPLOY_HOST:?set DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
REGISTRY_HOST="${REGISTRY_HOST:-ghcr.io}"
REGISTRY_USER="${REGISTRY_USER:-}"
REGISTRY_TOKEN="${REGISTRY_TOKEN:-}"
SKIP_SMOKE="${SKIP_SMOKE:-0}"
PIN_FILE="${PIN_FILE:-$ROOT/.release-images.env}"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"

if [ ! -f "$PIN_FILE" ]; then
  echo "missing pin file: $PIN_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$PIN_FILE"

: "${VDP_CORE_IMAGE:?VDP_CORE_IMAGE required in pin file}"
: "${VDP_HUB_IMAGE:?VDP_HUB_IMAGE required in pin file}"
: "${VDP_DOCS_IMAGE:?VDP_DOCS_IMAGE required in pin file}"
: "${VDP_EXTRACTION_IMAGE:?VDP_EXTRACTION_IMAGE required in pin file}"
: "${VDP_FE_IMAGE:?VDP_FE_IMAGE required in pin file}"
# VDP_MAIL_IMAGE / VDP_SMS_IMAGE optional — enable compose profile gateways when set.

REV_SHORT="$(printf '%s' "${GIT_REVISION:-${IMAGE_TAG:-unknown}}" | sed 's/^sha-//' | cut -c1-7)"

notify_deploy() {
  local status="$1"
  local body="${2:-}"
  [ -x "$NOTIFY" ] || chmod +x "$NOTIFY" 2>/dev/null || true
  [ -f "$NOTIFY" ] || return 0
  if [ -n "$body" ]; then
    "$NOTIFY" --kind promote --env "$ENVIRONMENT" --status "$status" --revision "$REV_SHORT" --body "$body" || true
  else
    "$NOTIFY" --kind promote --env "$ENVIRONMENT" --status "$status" --revision "$REV_SHORT" || true
  fi
}

on_deploy_err() {
  notify_deploy failed "выкат или дымовые не прошли"
}
trap on_deploy_err ERR

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes)
if [ -n "$SSH_KEY_PATH" ]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.release.yml"

echo "Deploying ${ENVIRONMENT} to ${DEPLOY_HOST}:${DEPLOY_PATH}"
echo "  core: ${VDP_CORE_IMAGE}"
echo "  hub:  ${VDP_HUB_IMAGE}"
echo "  docs: ${VDP_DOCS_IMAGE}"
echo "  extraction: ${VDP_EXTRACTION_IMAGE}"
echo "  mail: ${VDP_MAIL_IMAGE:-<skip>}"
echo "  sms:  ${VDP_SMS_IMAGE:-<skip>}"
echo "  fe:   ${VDP_FE_IMAGE}"

# Sync compose + scripts + migrations. Host-side secrets and pins must survive --delete.
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude '.env.deploy' \
  --exclude '.release-images.env' \
  --exclude '.release-images.*.last-good' \
  --exclude '.git' \
  --exclude 'bin/' \
  --exclude '.run/' \
  --exclude 'fe/node_modules' \
  --exclude 'fe/.output' \
  --exclude 'fe/test-results' \
  "$ROOT/" "${REMOTE}:${DEPLOY_PATH}/"

scp "${SSH_OPTS[@]}" "$PIN_FILE" "${REMOTE}:${DEPLOY_PATH}/.release-images.env"

REMOTE_CMD=$(cat <<'EOS'
set -euo pipefail
cd "$DEPLOY_PATH"

if [ ! -f .env.deploy ]; then
  echo "missing $DEPLOY_PATH/.env.deploy on host (see docs/operations/deploy-env.example)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.deploy
# shellcheck disable=SC1091
source .release-images.env
set +a
export ENVIRONMENT="${ENVIRONMENT_OVERRIDE:-${ENVIRONMENT:-staging}}"

if [ -n "${REGISTRY_TOKEN:-}" ] && [ -n "${REGISTRY_USER:-}" ]; then
  echo "$REGISTRY_TOKEN" | docker login "${REGISTRY_HOST:-ghcr.io}" -u "$REGISTRY_USER" --password-stdin
fi

chmod +x scripts/*.sh || true
export COMPOSE_FILES

if [ -x ./scripts/vdp-compose-up.sh ]; then
  # Pull digests first, then bring-up (postgres → migrate → stack → restart → health).
  PROFILES=(--profile prod)
  PULL_SVCS=(docs-service extraction hub core fe-prod)
  if [ -n "${VDP_MAIL_IMAGE:-}" ] || [ -n "${VDP_SMS_IMAGE:-}" ]; then
    PROFILES+=(--profile gateways)
    PULL_SVCS+=(mail-gateway sms-gateway)
  fi
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES "${PROFILES[@]}" pull "${PULL_SVCS[@]}"
  ./scripts/vdp-compose-up.sh
else
  PROFILES=(--profile prod)
  PULL_SVCS=(docs-service extraction hub core fe-prod)
  if [ -n "${VDP_MAIL_IMAGE:-}" ] || [ -n "${VDP_SMS_IMAGE:-}" ]; then
    PROFILES+=(--profile gateways)
    PULL_SVCS+=(mail-gateway sms-gateway)
  fi
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES "${PROFILES[@]}" pull "${PULL_SVCS[@]}"
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES "${PROFILES[@]}" up -d --no-build postgres-core postgres-hub
  ./scripts/compose-db-migrate.sh
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES "${PROFILES[@]}" up -d --no-build --scale fe=0
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES "${PROFILES[@]}" restart core hub
  ./scripts/wait-release-health.sh
fi

# Smoke writes test data, so it runs on non-production environments only.
if [ "$ENVIRONMENT" != "gamma" ] && [ "${SKIP_SMOKE:-0}" != "1" ]; then
  ./scripts/staging-smoke.sh
fi

cp .release-images.env ".release-images.${ENVIRONMENT}.last-good"
docker image prune -f >/dev/null 2>&1 || true
EOS
)

ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "DEPLOY_PATH='${DEPLOY_PATH}' ENVIRONMENT_OVERRIDE='${ENVIRONMENT}' COMPOSE_FILES='${COMPOSE_FILES}' \
   REGISTRY_HOST='${REGISTRY_HOST}' REGISTRY_USER='${REGISTRY_USER}' REGISTRY_TOKEN='${REGISTRY_TOKEN}' \
   SKIP_SMOKE='${SKIP_SMOKE}' bash -s" <<< "$REMOTE_CMD"

trap - ERR

SMOKE_BODY="дымовые на среде: ок"
if [ "$ENVIRONMENT" = "gamma" ] || [ "$SKIP_SMOKE" = "1" ]; then
  SMOKE_BODY="выкат без дымовых (политика среды)"
elif [ "$ENVIRONMENT" = "alpha" ]; then
  SMOKE_BODY="дымовые на среде alpha: ок"
fi
notify_deploy success "$SMOKE_BODY"

echo "deploy ${ENVIRONMENT} ok (tag=${IMAGE_TAG:-unknown})"
