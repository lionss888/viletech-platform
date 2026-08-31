#!/usr/bin/env bash
# sessionStart: remind agent to ask before Docker FE dependency refresh.
set -euo pipefail
cat <<'EOF'
{
  "additional_context": "VDP Docker FE: volume fe_node_modules не обновляется от host npm install / одного compose --build. При старте проекта или после обновления веток / sync fe — ОБЯЗАТЕЛЬНО спроси пользователя: «Обновить зависимости фронта в Docker (make compose-fe-refresh)?» Не запускай пересборку без явного «да»."
}
EOF
