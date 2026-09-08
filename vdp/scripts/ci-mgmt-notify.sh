#!/usr/bin/env bash
# Map CI context (Actions / secondary forge) → management Telegram via notify-mgmt.sh.
# Outbound text has no forge/tool brand names. Skip quietly when token/chat missing.
#
# Modes (arg or MGMT_CI_MODE): auto | push | review | pipeline-fail | dry-run
#
# Optional overrides:
#   MGMT_CI_BRANCH, MGMT_CI_REVISION, MGMT_CI_SUBJECT, MGMT_CI_EVENT,
#   MGMT_CI_REVIEW_STATUS, MGMT_CI_SOURCE_BRANCH, MGMT_CI_TARGET_BRANCH,
#   MGMT_CI_FAILED_STEPS (comma-separated: fast,docs,integration,playwright)
#   NEED_fast_RESULT / NEED_docs_RESULT / … (Actions needs.*.result)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"
MODE="${1:-${MGMT_CI_MODE:-auto}}"
DRY=0
if [ "$MODE" = "dry-run" ]; then
  DRY=1
  MODE=auto
fi

map_step() {
  case "$1" in
    fast|unit) printf '%s' "приёмка" ;;
    docs) printf '%s' "документация" ;;
    integration) printf '%s' "интеграция" ;;
    playwright|e2e|scenarios) printf '%s' "сценарии" ;;
    release-gate|release_gate) printf '%s' "полный контур" ;;
    promote*|write-release-pin) printf '%s' "выкат" ;;
    ""|unknown) printf '%s' "проверки" ;;
    *) printf '%s' "проверки" ;;
  esac
}

join_steps() {
  local out="" part mapped
  IFS=',' read -r -a parts <<<"$1"
  for part in "${parts[@]}"; do
    part="$(printf '%s' "$part" | tr -d '[:space:]')"
    [ -n "$part" ] || continue
    mapped="$(map_step "$part")"
    if [ -z "$out" ]; then
      out="$mapped"
    elif [[ ",$out," != *",$mapped,"* ]]; then
      out="$out / $mapped"
    fi
  done
  printf '%s' "${out:-проверки}"
}

is_default_branch() {
  case "$1" in
    main|master) return 0 ;;
  esac
  if [ -n "${CI_DEFAULT_BRANCH:-}" ] && [ "$1" = "$CI_DEFAULT_BRANCH" ]; then
    return 0
  fi
  return 1
}

BRANCH="${MGMT_CI_BRANCH:-}"
REVISION="${MGMT_CI_REVISION:-}"
SUBJECT="${MGMT_CI_SUBJECT:-}"
EVENT="${MGMT_CI_EVENT:-}"
REVIEW_STATUS="${MGMT_CI_REVIEW_STATUS:-}"
SOURCE_BRANCH="${MGMT_CI_SOURCE_BRANCH:-}"
TARGET_BRANCH="${MGMT_CI_TARGET_BRANCH:-}"
FAILED_STEPS="${MGMT_CI_FAILED_STEPS:-}"

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  BRANCH="${BRANCH:-${GITHUB_REF_NAME:-}}"
  REVISION="${REVISION:-${GITHUB_SHA:-}}"
  EVENT="${EVENT:-${GITHUB_EVENT_NAME:-}}"
  if [ -z "$SUBJECT" ] && [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "$GITHUB_EVENT_PATH" ]; then
    SUBJECT="$(python3 - "$GITHUB_EVENT_PATH" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
msg = ((d.get("head_commit") or {}).get("message") or "")
if not msg:
    msg = ((d.get("pull_request") or {}).get("title") or "")
print((msg.splitlines() or [""])[0][:160])
PY
)"
  fi
  if [ "$EVENT" = "pull_request" ] && [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "$GITHUB_EVENT_PATH" ]; then
    eval "$(python3 - "$GITHUB_EVENT_PATH" <<'PY'
import json, sys, shlex
d = json.load(open(sys.argv[1]))
pr = d.get("pull_request") or {}
action = d.get("action") or "synchronize"
head = (pr.get("head") or {}).get("ref") or ""
base = (pr.get("base") or {}).get("ref") or ""
if action == "closed" and pr.get("merged"):
    action = "merged"
print("REVIEW_STATUS=" + shlex.quote(action))
print("SOURCE_BRANCH=" + shlex.quote(head))
print("TARGET_BRANCH=" + shlex.quote(base))
PY
)"
    BRANCH="${SOURCE_BRANCH:-$BRANCH}"
  fi
elif [ -n "${GITLAB_CI:-}" ]; then
  BRANCH="${BRANCH:-${CI_COMMIT_REF_NAME:-}}"
  REVISION="${REVISION:-${CI_COMMIT_SHORT_SHA:-${CI_COMMIT_SHA:-}}}"
  SUBJECT="${SUBJECT:-${CI_COMMIT_TITLE:-}}"
  EVENT="${EVENT:-${CI_PIPELINE_SOURCE:-}}"
  if [ "$EVENT" = "merge_request_event" ]; then
    SOURCE_BRANCH="${SOURCE_BRANCH:-${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME:-$BRANCH}}"
    TARGET_BRANCH="${TARGET_BRANCH:-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}}"
    BRANCH="$SOURCE_BRANCH"
    if [ -z "$REVIEW_STATUS" ]; then
      case "${CI_MERGE_REQUEST_EVENT_TYPE:-update}" in
        open|reopen) REVIEW_STATUS=opened ;;
        merge) REVIEW_STATUS=merged ;;
        close) REVIEW_STATUS=closed ;;
        *) REVIEW_STATUS=updated ;;
      esac
    fi
  fi
fi

REVISION="$(printf '%s' "$REVISION" | cut -c1-7)"
BRANCH="${BRANCH:-unknown}"

collect_failed() {
  local failed="" name result
  if [ -n "$FAILED_STEPS" ]; then
    printf '%s' "$FAILED_STEPS"
    return 0
  fi
  for name in fast docs integration playwright release-gate; do
    eval "result=\${NEED_${name//-/_}_RESULT:-}"
    case "$result" in
      failure|failed|cancelled) failed="${failed:+$failed,}$name" ;;
    esac
  done
  if [ -z "$failed" ] && [ -n "${CI_JOB_STATUS:-}" ] && [ "${CI_JOB_STATUS}" != "success" ]; then
    case "${CI_JOB_NAME:-}" in
      fast|docs|integration|playwright|release-gate) failed="$CI_JOB_NAME" ;;
      *) failed="unknown" ;;
    esac
  fi
  printf '%s' "$failed"
}

run_notify() {
  local kind="$1"
  shift
  chmod +x "$NOTIFY"
  if [ "$DRY" = 1 ]; then
    echo "ci-mgmt-notify dry-run kind=$kind $*"
    "$NOTIFY" --dry-run --kind "$kind" "$@" || true
    return 0
  fi
  "$NOTIFY" --kind "$kind" "$@" || true
}

send_push() {
  local body=""
  [ -n "$SUBJECT" ] && body="Кратко: $SUBJECT"
  if [ -n "$body" ]; then
    run_notify push --title "$BRANCH" --branch "$BRANCH" --revision "$REVISION" --body "$body"
  else
    run_notify push --title "$BRANCH" --branch "$BRANCH" --revision "$REVISION"
  fi
}

send_review() {
  local title=""
  if [ -n "$SOURCE_BRANCH" ] && [ -n "$TARGET_BRANCH" ]; then
    title="${SOURCE_BRANCH} → ${TARGET_BRANCH}"
  elif [ -n "$SUBJECT" ]; then
    title="$SUBJECT"
  fi
  if [ -n "$title" ]; then
    run_notify review --status "${REVIEW_STATUS:-updated}" --title "$title" --branch "$BRANCH" --revision "$REVISION"
  else
    run_notify review --status "${REVIEW_STATUS:-updated}" --branch "$BRANCH" --revision "$REVISION"
  fi
}

send_pipeline_fail() {
  local steps="$1"
  local step_label
  step_label="$(join_steps "$steps")"
  run_notify pipeline --status failed --title "$step_label" --branch "$BRANCH" --revision "$REVISION"
}

FAILED="$(collect_failed)"

case "$MODE" in
  push) send_push ;;
  review) send_review ;;
  pipeline-fail) send_pipeline_fail "${FAILED:-unknown}" ;;
  auto)
    case "$EVENT" in
      push)
        if is_default_branch "$BRANCH"; then
          send_push
        fi
        ;;
      pull_request|merge_request_event)
        send_review
        ;;
    esac
    if [ -n "$FAILED" ]; then
      send_pipeline_fail "$FAILED"
    fi
    ;;
  *)
    echo "ci-mgmt-notify: unknown mode '$MODE'" >&2
    exit 2
    ;;
esac
