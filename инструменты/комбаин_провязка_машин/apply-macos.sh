#!/usr/bin/env bash
# Apply local QG (pre-commit / GitHub Desktop) on a macOS machine.
# Run from anywhere:
#   bash "инструменты/комбаин_провязка_машин/apply-macos.sh"
# Options:
#   --with-notify-env   create ~/.vedy_bot/env from example if missing (placeholders)
#   --gui-wrappers      install PATH wrappers so GitHub Desktop sees node/go/make
#   --dry-run           print actions only
set -euo pipefail

COMBAIN_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$COMBAIN_DIR/../.." && pwd)"
DRY_RUN=0
WITH_NOTIFY=0
GUI_WRAPPERS=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --with-notify-env) WITH_NOTIFY=1 ;;
    --gui-wrappers) GUI_WRAPPERS=1 ;;
    -h|--help)
      sed -n '1,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "DRY: $*"
  else
    "$@"
  fi
}

echo "Repo: $REPO_ROOT"
echo "Combain: $COMBAIN_DIR"

if [ ! -d "$REPO_ROOT/.githooks" ]; then
  echo "FAIL: .githooks missing at repo root" >&2
  exit 1
fi

if [ ! -d "$REPO_ROOT/vdp" ]; then
  echo "FAIL: vdp/ missing" >&2
  exit 1
fi

# 1) Executable bits on shared hooks + scripts
run chmod +x \
  "$REPO_ROOT/.githooks/pre-commit" \
  "$REPO_ROOT/.githooks/pre-push" \
  "$REPO_ROOT/.githooks/post-commit" \
  "$REPO_ROOT/.githooks/post-merge" \
  "$REPO_ROOT/vdp/scripts/check-env-parity.sh" \
  "$REPO_ROOT/vdp/scripts/precommit-mgmt-notify.sh" \
  "$REPO_ROOT/vdp/scripts/notify-mgmt.sh" \
  "$COMBAIN_DIR/path-bootstrap.sh" \
  "$COMBAIN_DIR/verify.sh" \
  "$COMBAIN_DIR/apply-macos.sh"

# 2) Point git at hooks (same as make -C vdp install-git-hooks)
if [ "$GUI_WRAPPERS" -eq 1 ]; then
  WRAP_DIR="${HOME}/.vdp-machine/hooks"
  run mkdir -p "$WRAP_DIR"
  run cp "$COMBAIN_DIR/path-bootstrap.sh" "${HOME}/.vdp-machine/path-bootstrap.sh"
  for hook in pre-commit pre-push post-commit post-merge; do
    target="$WRAP_DIR/$hook"
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "DRY: write wrapper $target"
      continue
    fi
    cat >"$target" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export VDP_REPO_ROOT="$REPO_ROOT"
# shellcheck disable=SC1090
. "\${HOME}/.vdp-machine/path-bootstrap.sh"
exec "$REPO_ROOT/.githooks/$hook" "\$@"
EOF
    chmod +x "$target"
  done
  run git -C "$REPO_ROOT" config core.hooksPath "$WRAP_DIR"
  echo "hooksPath → $WRAP_DIR (GUI-safe wrappers → repo .githooks)"
else
  run git -C "$REPO_ROOT" config core.hooksPath .githooks
  echo "hooksPath → .githooks (repo-relative; OK for Terminal, may miss PATH in GitHub Desktop)"
fi

# 3) Optional mgmt notify env
if [ "$WITH_NOTIFY" -eq 1 ]; then
  DEST="${HOME}/.vedy_bot/env"
  run mkdir -p "${HOME}/.vedy_bot"
  if [ -f "$DEST" ]; then
    echo "Keep existing $DEST"
  else
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "DRY: cp example → $DEST"
    else
      cp "$COMBAIN_DIR/env.mgmt.notify.example" "$DEST"
      chmod 600 "$DEST"
      echo "Created $DEST — replace REPLACE_WITH_* values"
    fi
  fi
fi

# 4) Quick toolchain hints (non-fatal)
need_hint=0
if ! command -v node >/dev/null 2>&1; then
  echo "WARN: node not on PATH (need $(tr -d '[:space:]' <"$REPO_ROOT/vdp/fe/.nvmrc" 2>/dev/null || echo 22.x))"
  need_hint=1
fi
if ! command -v go >/dev/null 2>&1; then
  echo "WARN: go not on PATH (need >= 1.22)"
  need_hint=1
fi
if ! command -v make >/dev/null 2>&1; then
  echo "WARN: make not on PATH (xcode-select --install or brew install make)"
  need_hint=1
fi

echo ""
echo "Apply done."
echo "Next: bash \"$COMBAIN_DIR/verify.sh\""
if [ "$need_hint" -eq 1 ]; then
  echo "Install Node 22.17.0 (nvm/mise/brew) and Go 1.22+, then re-run verify."
fi
if [ "$GUI_WRAPPERS" -eq 0 ]; then
  echo "GitHub Desktop commits fail with 'node: command not found'? Re-run with --gui-wrappers"
fi
