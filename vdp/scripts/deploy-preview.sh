#!/usr/bin/env bash
# Promote a pinned digest to an isolated compose project on the test VM (PR preview).
# Never builds on the host. Unique loopback ports + Caddy site pr-N.preview.vedy.io.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PR_NUMBER="${PR_NUMBER:?set PR_NUMBER}"
PREVIEW_DOMAIN="${PREVIEW_DOMAIN:-preview.vedy.io}"
DEPLOY_HOST="${DEPLOY_HOST:?set DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
REGISTRY_HOST="${REGISTRY_HOST:-ghcr.io}"
REGISTRY_USER="${REGISTRY_USER:-}"
REGISTRY_TOKEN="${REGISTRY_TOKEN:-}"
PIN_FILE="${PIN_FILE:-$ROOT/.release-images.env}"
PROJECT="pr-${PR_NUMBER}"

if [ ! -f "$PIN_FILE" ]; then
  echo "missing pin file: $PIN_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$PIN_FILE"
: "${VDP_CORE_IMAGE:?}"
: "${VDP_HUB_IMAGE:?}"
: "${VDP_FE_IMAGE:?}"

base=$((20000 + (PR_NUMBER % 400) * 10))
FE_PORT=$((base + 0))
CORE_PORT=$((base + 1))
HUB_PORT=$((base + 2))

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes)
if [ -n "$SSH_KEY_PATH" ]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

echo "Preview ${PROJECT} on ${DEPLOY_HOST} fe=127.0.0.1:${FE_PORT}"

rsync -az \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude '.env.deploy' \
  --exclude '.release-images.env' \
  --exclude '.git' \
  --exclude 'bin/' \
  --exclude 'fe/node_modules' \
  "$ROOT/" "${REMOTE}:${DEPLOY_PATH}/"

scp "${SSH_OPTS[@]}" "$PIN_FILE" "${REMOTE}:${DEPLOY_PATH}/.release-images.${PROJECT}.env"

# shellcheck disable=SC2087
ssh "${SSH_OPTS[@]}" "$REMOTE" "PR_NUMBER=$PR_NUMBER PROJECT=$PROJECT FE_PORT=$FE_PORT CORE_PORT=$CORE_PORT HUB_PORT=$HUB_PORT PREVIEW_DOMAIN=$PREVIEW_DOMAIN DEPLOY_PATH=$DEPLOY_PATH REGISTRY_HOST=$REGISTRY_HOST REGISTRY_USER='$REGISTRY_USER' REGISTRY_TOKEN='$REGISTRY_TOKEN' VDP_CORE_IMAGE='$VDP_CORE_IMAGE' VDP_HUB_IMAGE='$VDP_HUB_IMAGE' VDP_DOCS_IMAGE='${VDP_DOCS_IMAGE:-}' VDP_MAIL_IMAGE='${VDP_MAIL_IMAGE:-}' VDP_SMS_IMAGE='${VDP_SMS_IMAGE:-}' VDP_FE_IMAGE='$VDP_FE_IMAGE'" bash -s <<'EOS'
set -euo pipefail
cd "$DEPLOY_PATH"
if [ ! -f .env.deploy ]; then
  echo "missing $DEPLOY_PATH/.env.deploy" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env.deploy
# shellcheck disable=SC1091
source ".release-images.${PROJECT}.env"
set +a

if [ -n "${REGISTRY_USER}" ] && [ -n "${REGISTRY_TOKEN}" ]; then
  echo "${REGISTRY_TOKEN}" | docker login "${REGISTRY_HOST}" -u "${REGISTRY_USER}" --password-stdin
fi

cat > "docker-compose.preview.${PROJECT}.yml" <<YAML
services:
  postgres-core:
    ports: []
  postgres-hub:
    ports: []
  hub:
    ports:
      - "127.0.0.1:${HUB_PORT}:8081"
  core:
    ports:
      - "127.0.0.1:${CORE_PORT}:8080"
  fe:
    ports: []
  fe-prod:
    ports:
      - "127.0.0.1:${FE_PORT}:3000"
YAML

docker compose -p "$PROJECT" \
  -f docker-compose.yml -f docker-compose.release.yml -f "docker-compose.preview.${PROJECT}.yml" \
  --profile prod pull
docker compose -p "$PROJECT" \
  -f docker-compose.yml -f docker-compose.release.yml -f "docker-compose.preview.${PROJECT}.yml" \
  --profile prod up -d --no-build --scale fe=0

if command -v caddy >/dev/null 2>&1; then
  snippet="/etc/caddy/preview.d/${PROJECT}.caddy"
  sudo mkdir -p /etc/caddy/preview.d
  sudo tee "$snippet" >/dev/null <<CADDY
${PROJECT}.${PREVIEW_DOMAIN} {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:${CORE_PORT}
	}
	handle {
		reverse_proxy 127.0.0.1:${FE_PORT}
	}
}
CADDY
  sudo caddy reload --config /etc/caddy/Caddyfile || sudo systemctl reload caddy || true
fi
echo "preview url https://${PROJECT}.${PREVIEW_DOMAIN}"
EOS
