#!/usr/bin/env bash
# Build notification wrapper: notify before and after build/test operations.
# Usage: ./build-notify.sh <operation-name> <command...>
# Example: ./build-notify.sh "docker compose up" docker compose up -d

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY="$ROOT/scripts/notify-mgmt.sh"

OPERATION="${1:-build}"
shift

# Load local secrets if available (try ~/.vedy_bot first, then ~/.vdp-intake)
if [ -f ~/.vedy_bot/env ]; then
  set +u
  source ~/.vedy_bot/env
  set -u
elif [ -f ~/.vdp-intake/env ]; then
  set +u
  source ~/.vdp-intake/env
  set -u
fi

# Skip if no token or notify not available
if [ ! -x "$NOTIFY" ] || [ -z "${MGMT_NOTIFY_TOKEN:-}${TELEGRAM_INTAKE_TOKEN:-}" ]; then
  # Still execute the command even without notifications
  exec "$@"
fi

REVISION="$(git -C "$ROOT/.." rev-parse --short HEAD 2>/dev/null || git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo local)"

# Notify start
"$NOTIFY" \
  --kind progress \
  --title "сборка: $OPERATION" \
  --status progress \
  --revision "$REVISION" \
  --body "⚙️ Начало: $OPERATION" \
  || true

# Execute command and capture exit code
set +e
"$@"
EXIT_CODE=$?
set -e

# Notify result
if [ $EXIT_CODE -eq 0 ]; then
  "$NOTIFY" \
    --kind progress \
    --title "сборка: $OPERATION" \
    --status success \
    --revision "$REVISION" \
    --body "✅ Успешно: $OPERATION" \
    || true
else
  "$NOTIFY" \
    --kind blocker \
    --title "сборка: $OPERATION" \
    --status failed \
    --revision "$REVISION" \
    --body "❌ Ошибка: $OPERATION (exit code: $EXIT_CODE)" \
    || true
fi

exit $EXIT_CODE
