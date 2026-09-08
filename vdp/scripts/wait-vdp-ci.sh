#!/usr/bin/env bash
# Wait until workflow "VDP CI" (vdp-ci.yml) has a successful completed run for SHA.
# Used by VDP Images on push to main so digests are not published on a red CI SHA.
#
# Env:
#   SHA (required) — git commit
#   GH_TOKEN / GITHUB_TOKEN — gh auth
#   GITHUB_REPOSITORY — owner/repo (set by Actions)
#   WAIT_TIMEOUT_SEC — default 5400 (90m)
#   WAIT_POLL_SEC — default 30
set -euo pipefail

SHA="${SHA:?SHA required}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TIMEOUT="${WAIT_TIMEOUT_SEC:-5400}"
POLL="${WAIT_POLL_SEC:-30}"
WORKFLOW="${VDP_CI_WORKFLOW:-vdp-ci.yml}"

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL: gh CLI required" >&2
  exit 1
fi

deadline=$((SECONDS + TIMEOUT))
echo "wait-vdp-ci: repo=$REPO sha=$SHA workflow=$WORKFLOW timeout=${TIMEOUT}s"

while (( SECONDS < deadline )); do
  # shellcheck disable=SC2016
  row=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --commit "$SHA" --limit 20 \
    --json databaseId,status,conclusion,event,url \
    --jq '[.[] | select(.status=="completed")] | .[0] // empty' 2>/dev/null || true)

  if [ -n "$row" ] && [ "$row" != "null" ]; then
    conclusion=$(echo "$row" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("conclusion") or "")')
    url=$(echo "$row" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("url") or "")')
    if [ "$conclusion" = "success" ]; then
      echo "wait-vdp-ci: green VDP CI $url"
      exit 0
    fi
    echo "FAIL: VDP CI finished with conclusion=$conclusion $url" >&2
    exit 1
  fi

  in_flight=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --commit "$SHA" --limit 20 \
    --json status --jq '[.[] | select(.status!="completed")] | length' 2>/dev/null || echo 0)
  echo "wait-vdp-ci: no completed run yet (in_flight=${in_flight:-0}); sleep ${POLL}s"
  sleep "$POLL"
done

echo "FAIL: timed out waiting for VDP CI on $SHA" >&2
exit 1
