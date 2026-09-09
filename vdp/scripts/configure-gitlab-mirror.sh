#!/usr/bin/env bash
# Configure GitHub secrets for VDP Mirror → GitLab (group vdp888).
#
# Does not print secret values. Requires:
#   - gh CLI authenticated to GitHub (repo admin)
#   - env GITLAB_MIRROR_TOKEN (GitLab PAT / project/group token with write_repository
#     and, for image copy, read_registry/write_registry as needed)
#
# Usage (from repo root or vdp/):
#   export GITLAB_MIRROR_TOKEN='glpat-…'
#   ./vdp/scripts/configure-gitlab-mirror.sh
#   ./vdp/scripts/configure-gitlab-mirror.sh --url https://gitlab.com/vdp888/viletech-platform
#   ./vdp/scripts/configure-gitlab-mirror.sh --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="${GITHUB_REPOSITORY:-}"
MIRROR_URL="${GITLAB_MIRROR_URL:-https://gitlab.com/vdp888/viletech-platform}"
REGISTRY_PROJECT="${GITLAB_REGISTRY_PROJECT:-}"
DRY=0

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --url) MIRROR_URL="${2:-}"; shift 2 ;;
    --registry-project) REGISTRY_PROJECT="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done

MIRROR_URL="${MIRROR_URL%/}"
MIRROR_URL="${MIRROR_URL%.git}"

if [ -z "$REGISTRY_PROJECT" ]; then
  # https://gitlab.com/vdp888/foo → vdp888/foo
  REGISTRY_PROJECT="$(printf '%s' "$MIRROR_URL" | sed -E 's#https?://[^/]+/##')"
fi

if [ -z "${GITLAB_MIRROR_TOKEN:-}" ] && [ "$DRY" != "1" ]; then
  echo "FAIL: export GITLAB_MIRROR_TOKEN before running (value not logged)." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL: gh CLI required (https://cli.github.com/)." >&2
  exit 1
fi

if [ -z "$REPO" ]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
if [ -z "$REPO" ] && [ "$DRY" != "1" ]; then
  echo "FAIL: set --repo owner/name or run inside a GitHub checkout." >&2
  exit 1
fi
REPO="${REPO:-lionss888/viletech-platform}"

echo "repo=$REPO"
echo "GITLAB_MIRROR_URL=$MIRROR_URL"
echo "GITLAB_REGISTRY_PROJECT=$REGISTRY_PROJECT"
if [ -n "${GITLAB_MIRROR_TOKEN:-}" ]; then
  echo "GITLAB_MIRROR_TOKEN=<set, ${#GITLAB_MIRROR_TOKEN} chars>"
else
  echo "GITLAB_MIRROR_TOKEN=<not set>"
fi

if [ "$DRY" = "1" ]; then
  echo "dry-run: no secrets written"
  exit 0
fi

cd "$ROOT"
printf '%s' "$MIRROR_URL" | gh secret set GITLAB_MIRROR_URL --repo "$REPO"
printf '%s' "$GITLAB_MIRROR_TOKEN" | gh secret set GITLAB_MIRROR_TOKEN --repo "$REPO"
printf '%s' "$REGISTRY_PROJECT" | gh secret set GITLAB_REGISTRY_PROJECT --repo "$REPO"

echo "Secrets set. Trigger a sync:"
echo "  gh workflow run \"VDP Mirror to GitLab\" --repo $REPO -f branch=main"
echo "Or push to main / open Actions → VDP Mirror to GitLab → Run workflow."
