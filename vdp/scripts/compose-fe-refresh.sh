#!/usr/bin/env bash
# Refresh fe deps inside Docker named volume fe_node_modules, then restart fe.
# Interactive by default: asks the user. Non-interactive: pass --yes or FE_REFRESH=1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

YES=0
for arg in "$@"; do
  case "$arg" in
    -y|--yes) YES=1 ;;
    -h|--help)
      echo "Usage: $0 [--yes]"
      echo "  Refresh npm deps in the fe container volume and restart the service."
      echo "  Without --yes, prompts interactively (or requires FE_REFRESH=1)."
      exit 0
      ;;
  esac
done

if [[ "${FE_REFRESH:-}" == "1" ]]; then
  YES=1
fi

if [[ "$YES" != "1" ]]; then
  if [[ ! -t 0 ]]; then
    echo "Non-interactive shell: pass --yes or FE_REFRESH=1 to refresh fe deps." >&2
    exit 2
  fi
  read -r -p "Обновить зависимости fe в Docker (npm install + restart)? [y/N] " ans
  case "$ans" in
    y|Y|yes|YES|да|Да|ДА) ;;
    *)
      echo "Пропуск. При 500 на :5173 запустите: make compose-fe-refresh"
      exit 0
      ;;
  esac
fi

if ! docker compose ps --status running --services 2>/dev/null | grep -qx fe; then
  echo "Сервис fe не запущен. Сначала: make compose-up" >&2
  exit 1
fi

echo "== fe: npm install (volume fe_node_modules) =="
docker compose exec -T fe npm install
echo "== fe: restart =="
docker compose restart fe
echo "== fe: wait for HTTP 200 =="
ok=0
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:5173/; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" != "1" ]]; then
  echo "fe health timeout after refresh" >&2
  docker compose ps fe
  docker compose logs --tail 40 fe >&2 || true
  exit 1
fi
echo "fe refreshed: http://localhost:5173"
