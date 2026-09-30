#!/usr/bin/env bash
# Pre-push: path-aware gate по умолчанию (выбирает уровень по изменённым файлам).
# Полная страховка (push-gate = test-integration + ci-main): FULL_PREPUSH_GATE=1.
# Emergency bypass: SKIP_PREPUSH_GATE=1 (prints warn, exit 0).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
MATCH="$ROOT/scripts/pilot-matrix-paths-match.sh"
FULL_E2E="$ROOT/scripts/main-full-e2e-paths-match.sh"

if [ "${SKIP_PREPUSH_GATE:-0}" = "1" ]; then
  echo "WARNING: SKIP_PREPUSH_GATE=1 — pre-push gate skipped. Push is not locally insured." >&2
  exit 0
fi

ensure_docker_for_gate() {
  # Compose / Playwright need the daemon; start Desktop if sock is missing.
  chmod +x "$ROOT/scripts/ensure-docker.sh" 2>/dev/null || true
  "$ROOT/scripts/ensure-docker.sh"
}

# Opt-in для полного марафона (перед merge в main / по явному запросу).
if [ "${FULL_PREPUSH_GATE:-0}" = "1" ]; then
  echo "prepush-gate: FULL_PREPUSH_GATE=1 — запуск полной страховки → make push-gate"
  echo "prepush-gate: ~15–40 min (test-integration + ci-main)"
  ensure_docker_for_gate
  cd "$ROOT"
  exec make push-gate
fi

# Default: path-aware — выбор уровня по затронутым файлам.
echo "prepush-gate: path-aware mode — выбор проверки по diff"
chmod +x "$MATCH" "$FULL_E2E" 2>/dev/null || true

cd "$REPO_ROOT"
base=""
if git rev-parse --verify @{upstream} >/dev/null 2>&1; then
  base="$(git merge-base HEAD @{upstream} 2>/dev/null || true)"
fi
if [ -z "$base" ] && git rev-parse --verify origin/main >/dev/null 2>&1; then
  base="$(git merge-base HEAD origin/main 2>/dev/null || true)"
fi
if [ -z "$base" ] && git rev-parse --verify origin/master >/dev/null 2>&1; then
  base="$(git merge-base HEAD origin/master 2>/dev/null || true)"
fi
if [ -z "$base" ]; then
  echo "prepush-gate: no upstream/origin/main base — running ci-pr-pilot (safe default)" >&2
  ensure_docker_for_gate
  cd "$ROOT"
  exec make ci-pr-pilot
fi

changed="$(git diff --name-only "$base"...HEAD || true)"
wt="$(git diff --name-only HEAD 2>/dev/null || true)"
staged="$(git diff --cached --name-only 2>/dev/null || true)"
all_paths="$(printf '%s\n%s\n%s\n' "$changed" "$wt" "$staged" | sed '/^$/d' | sort -u)"

echo "prepush-gate: base=$base"
if [ -z "$all_paths" ]; then
  echo "prepush-gate: no changed files vs base — running ci-pr"
  ensure_docker_for_gate
  cd "$ROOT"
  exec make ci-pr
fi

# Fast path: только docs/notes/plans → только docs-format-check (~секунды).
docs_only=1
while IFS= read -r p; do
  [ -z "$p" ] && continue
  case "$p" in
    vdp/docs/*|docs/*|*.md|заметки/*|.cursor/plans/*|.cursor/handoff/*) ;;
    *) docs_only=0; break ;;
  esac
done <<< "$all_paths"

if [ "$docs_only" -eq 1 ]; then
  echo "prepush-gate: только тексты/планы → make docs-format-check"
  cd "$ROOT"
  exec make docs-format-check
fi

if printf '%s\n' "$all_paths" | "$FULL_E2E"; then
  echo "prepush-gate: e2e outside PR-smoke → make ci-main"
  ensure_docker_for_gate
  cd "$ROOT"
  exec make ci-main
fi

if printf '%s\n' "$all_paths" | "$MATCH"; then
  echo "prepush-gate: ladder paths detected → make ci-pr-pilot"
  ensure_docker_for_gate
  cd "$ROOT"
  exec make ci-pr-pilot
fi

echo "prepush-gate: no ladder / full-e2e paths → make ci-pr"
ensure_docker_for_gate
cd "$ROOT"
exec make ci-pr
