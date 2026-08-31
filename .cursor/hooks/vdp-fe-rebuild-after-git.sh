#!/usr/bin/env bash
# postToolUse (Shell): after git branch updates, remind agent to ask about FE refresh.
set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(d.get('command') or (d.get('input') or {}).get('command') or '')
" 2>/dev/null || true)

if [[ -z "$cmd" ]]; then
  echo '{}'
  exit 0
fi

# macOS/BSD grep: avoid nested POSIX classes inside [].
if ! printf '%s' "$cmd" | grep -Eiq '(^|[ ;|&])git +(pull|fetch|checkout|switch|merge|rebase|cherry-pick)( |$)'; then
  echo '{}'
  exit 0
fi

if printf '%s' "$cmd" | grep -Eiq 'vdp/fe|lovable|package\.json|package-lock|bun\.lock'; then
  ctx='После обновления веток/кода fe: спроси пользователя, нужно ли обновить зависимости фронта в Docker (make compose-fe-refresh). Не делай npm install в контейнере без явного «да».'
else
  ctx='После git pull/checkout/merge: если менялся vdp/fe (зависимости или sync), спроси пользователя про make compose-fe-refresh. Не пересобирай fe молча.'
fi

CTX="$ctx" python3 -c 'import json, os; print(json.dumps({"additional_context": os.environ["CTX"]}))'
exit 0
