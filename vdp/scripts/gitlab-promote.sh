#!/usr/bin/env bash
# Promote the same digest pin on a GitLab runner host (no rebuild).
# Requires: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY (file or env), PIN from artifact.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT="${DEPLOY_ENVIRONMENT:-${ENVIRONMENT:-alpha}}"
PIN_FILE="${PIN_FILE:-$ROOT/.release-images.env}"

if [ ! -f "$PIN_FILE" ]; then
  echo "missing pin $PIN_FILE" >&2
  exit 1
fi

if [ -z "${DEPLOY_HOST:-}" ] || [ -z "${DEPLOY_SSH_KEY:-}" ]; then
  echo "DEPLOY_HOST / DEPLOY_SSH_KEY not set — skip GitLab promote for ${ENVIRONMENT}"
  exit 0
fi

KEY_FILE=$(mktemp)
printf '%s\n' "$DEPLOY_SSH_KEY" >"$KEY_FILE"
chmod 600 "$KEY_FILE"
export SSH_KEY_PATH="$KEY_FILE"
export ENVIRONMENT
export PIN_FILE
export DEPLOY_USER="${DEPLOY_USER:-deploy}"
export DEPLOY_PATH="${DEPLOY_PATH:-/opt/vdp}"
export REGISTRY_HOST="${REGISTRY_HOST:-registry.gitlab.com}"
export REGISTRY_USER="${REGISTRY_USER:-gitlab-ci-token}"
export REGISTRY_TOKEN="${REGISTRY_TOKEN:-${CI_JOB_TOKEN:-}}"

chmod +x "$ROOT/scripts/deploy-compose-release.sh"
"$ROOT/scripts/deploy-compose-release.sh"
rm -f "$KEY_FILE"
