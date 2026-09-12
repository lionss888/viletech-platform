#!/usr/bin/env bash
# Map CI context (Actions / secondary forge) → management Telegram via notify-mgmt.sh.
# Outbound text has no forge/tool brand names. Skip quietly when token/chat missing.
#
# Modes (arg or MGMT_CI_MODE):
#   auto | push | review | pipeline-fail | gate-summary |
#   deploy-ok | deploy-fail | pre-images-gate | dry-run
#
# Optional overrides:
#   MGMT_CI_BRANCH, MGMT_CI_REVISION, MGMT_CI_SUBJECT, MGMT_CI_EVENT,
#   MGMT_CI_REVIEW_STATUS, MGMT_CI_SOURCE_BRANCH, MGMT_CI_TARGET_BRANCH,
#   MGMT_CI_FAILED_STEPS (comma-separated: fast,docs,integration,playwright)
#   MGMT_CI_ENV (deploy target: alpha|beta|gamma|…)
#   MGMT_CI_GATE_STATUS (passed|failed for pre-images-gate)
#   MGMT_CI_BODY (optional body for promote/gate)
#   NEED_fast_RESULT / NEED_docs_RESULT / … (Actions needs.*.result)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"
MODE="${1:-${MGMT_CI_MODE:-auto}}"
DRY=0
if [ "${MGMT_CI_DRY:-0}" = "1" ]; then
  DRY=1
fi
if [ "$MODE" = "dry-run" ]; then
  DRY=1
  MODE="${2:-${MGMT_CI_MODE:-auto}}"
fi

map_step() {
  case "$1" in
    fast|unit) printf '%s' "приёмка" ;;
    docs) printf '%s' "документация" ;;
    integration) printf '%s' "интеграция" ;;
    playwright|e2e|scenarios) printf '%s' "сценарии" ;;
    pilot-matrix|pilot_matrix) printf '%s' "лестница ролей" ;;
    release-gate|release_gate) printf '%s' "полный контур" ;;
    promote*|write-release-pin|deploy) printf '%s' "выкат" ;;
    wait-for-ci|images) printf '%s' "перед сборкой образов" ;;
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
ENV_NAME="${MGMT_CI_ENV:-}"
GATE_STATUS="${MGMT_CI_GATE_STATUS:-}"
EXTRA_BODY="${MGMT_CI_BODY:-}"

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
  for name in fast docs integration playwright pilot-matrix release-gate; do
    eval "result=\${NEED_${name//-/_}_RESULT:-}"
    case "$result" in
      failure|failed|cancelled) failed="${failed:+$failed,}$name" ;;
    esac
  done
  if [ -z "$failed" ] && [ -n "${CI_JOB_STATUS:-}" ] && [ "${CI_JOB_STATUS}" != "success" ]; then
    case "${CI_JOB_NAME:-}" in
      fast|docs|integration|playwright|pilot-matrix|release-gate) failed="$CI_JOB_NAME" ;;
      *) failed="unknown" ;;
    esac
  fi
  printf '%s' "$failed"
}

collect_seen_steps() {
  local out="" name result
  for name in fast docs integration playwright pilot-matrix release-gate; do
    eval "result=\${NEED_${name//-/_}_RESULT:-}"
    [ -n "$result" ] || continue
    case "$result" in
      skipped) continue ;;
    esac
    out="${out:+$out,}$name"
  done
  if [ -z "$out" ] && [ -n "$FAILED_STEPS" ]; then
    out="$FAILED_STEPS"
  fi
  printf '%s' "${out:-fast,docs,integration,playwright}"
}

run_notify() {
  local kind="$1"
  shift
  chmod +x "$NOTIFY"
  local req=()
  if [ "${MGMT_NOTIFY_REQUIRE:-0}" = "1" ]; then
    req=(--require)
  fi
  if [ "$DRY" = 1 ]; then
    echo "ci-mgmt-notify dry-run kind=$kind $*"
    "$NOTIFY" --dry-run --kind "$kind" "$@" || true
    return 0
  fi
  if [ "${MGMT_NOTIFY_REQUIRE:-0}" = "1" ]; then
    "$NOTIFY" "${req[@]}" --kind "$kind" "$@"
  else
    "$NOTIFY" --kind "$kind" "$@" || true
  fi
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

send_gate_summary() {
  local failed="$1"
  local steps label
  if [ -n "$failed" ]; then
    send_pipeline_fail "$failed"
    return 0
  fi
  steps="$(collect_seen_steps)"
  label="$(join_steps "$steps")"
  run_notify gate --status passed --title "$label" --branch "$BRANCH" --revision "$REVISION"
}

send_deploy_ok() {
  local env_l="${ENV_NAME:-среда}"
  local body="${EXTRA_BODY:-}"
  if [ -z "$body" ]; then
    case "$env_l" in
      alpha) body="Среда alpha обновлена. Дымовые проверки прошли — вход и API доступны." ;;
      *) body="Среда обновлена. Дымовые проверки прошли." ;;
    esac
  fi
  run_notify promote --env "$env_l" --status success --revision "$REVISION" --body "$body"
}

send_deploy_fail() {
  local env_l="${ENV_NAME:-среда}"
  local body="${EXTRA_BODY:-Выкат или дымовые проверки на среде не прошли. Стенд мог остаться на прошлой ревизии.}"
  run_notify promote --env "$env_l" --status failed --revision "$REVISION" --body "$body"
  run_notify pipeline --status failed --title "выкат" --branch "${ENV_NAME:-$BRANCH}" --revision "$REVISION"
}

send_pre_images_gate() {
  local st="${GATE_STATUS:-passed}"
  case "$st" in
    failed|fail|error|failure)
      run_notify pipeline --status failed --title "перед сборкой образов" --branch "$BRANCH" --revision "$REVISION"
      ;;
    *)
      run_notify gate --status passed --title "перед сборкой образов" --branch "$BRANCH" --revision "$REVISION"
      ;;
  esac
}

FAILED="$(collect_failed)"

case "$MODE" in
  push) send_push ;;
  review) send_review ;;
  pipeline-fail) send_pipeline_fail "${FAILED:-unknown}" ;;
  gate-summary) send_gate_summary "$FAILED" ;;
  deploy-ok) send_deploy_ok ;;
  deploy-fail) send_deploy_fail ;;
  pre-images-gate) send_pre_images_gate ;;
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
    send_gate_summary "$FAILED"
    ;;
  *)
    echo "ci-mgmt-notify: unknown mode '$MODE'" >&2
    exit 2
    ;;
esac
