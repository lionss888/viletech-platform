#!/usr/bin/env bash
# Apply core/hub SQL migrations to compose Postgres (idempotent ADD IF NOT EXISTS).
# Optional env:
#   COMPOSE_FILES          e.g. "-f docker-compose.yml -f docker-compose.release.yml"
#   COMPOSE_PROJECT_NAME   docker compose project (preview: pr-N); native compose env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE_MIG="$ROOT/core/migrations"
HUB_MIG="$ROOT/hub/migrations"

# Word-split COMPOSE_FILES intentionally (caller supplies -f flags).
# shellcheck disable=SC2086
dc() {
  docker compose ${COMPOSE_FILES:-} "$@"
}

wait_pg() {
  local svc=$1 user=$2 db=$3
  for _ in $(seq 1 30); do
    if dc exec -T "$svc" psql -U "$user" -d "$db" -c 'SELECT 1' >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "FAIL: postgres $svc not ready" >&2
  exit 1
}

apply() {
  local svc=$1 user=$2 db=$3 file=$4
  echo "migrate: $(basename "$file") -> $db"
  dc exec -T "$svc" psql -U "$user" -d "$db" -v ON_ERROR_STOP=1 -f - <"$file"
}

cd "$ROOT"
wait_pg postgres-core vdp_core vdp_core
# Lexical order of numbered *.sql files.
for f in "$CORE_MIG"/*.sql; do
  apply postgres-core vdp_core vdp_core "$f"
done
wait_pg postgres-hub vdp_hub vdp_hub
for f in "$HUB_MIG"/*.sql; do
  apply postgres-hub vdp_hub vdp_hub "$f"
done
echo "compose-db-migrate green"
