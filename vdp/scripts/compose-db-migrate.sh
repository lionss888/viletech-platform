#!/usr/bin/env bash
# Apply core/hub SQL migrations to compose Postgres (idempotent ADD IF NOT EXISTS).
# Optional env:
#   COMPOSE_FILES          e.g. "-f docker-compose.yml -f docker-compose.release.yml"
#   COMPOSE_PROJECT_NAME   docker compose project (preview: pr-N); native compose env
#
# Fresh volumes run docker-entrypoint-initdb.d, then Postgres shuts down and restarts.
# A single SELECT 1 can succeed mid-init; migrate must wait for a stable window and
# retry if psql hits "database system is shutting down".
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE_MIG="$ROOT/core/migrations"
HUB_MIG="$ROOT/hub/migrations"

# Word-split COMPOSE_FILES intentionally (caller supplies -f flags).
# shellcheck disable=SC2086
dc() {
  docker compose ${COMPOSE_FILES:-} "$@"
}

pg_ready() {
  local svc=$1 user=$2 db=$3
  dc exec -T "$svc" psql -U "$user" -d "$db" -c 'SELECT 1' >/dev/null 2>&1
}

# Require consecutive successful probes so we outlive the post-initdb restart.
wait_pg() {
  local svc=$1 user=$2 db=$3
  local need=5
  local got=0
  local i
  for i in $(seq 1 90); do
    if pg_ready "$svc" "$user" "$db"; then
      got=$((got + 1))
      if [ "$got" -ge "$need" ]; then
        return 0
      fi
    else
      got=0
    fi
    sleep 1
  done
  echo "FAIL: postgres $svc not stable after init (need ${need} consecutive ready probes)" >&2
  dc logs --tail=80 "$svc" >&2 || true
  exit 1
}

is_transient_psql_err() {
  local err=$1
  echo "$err" | grep -qiE 'shutting down|connection refused|the database system is starting up|server closed the connection|could not connect' 
}

apply() {
  local svc=$1 user=$2 db=$3 file=$4
  local attempt=1
  local max=12
  local err
  echo "migrate: $(basename "$file") -> $db"
  while [ "$attempt" -le "$max" ]; do
    if err="$(dc exec -T "$svc" psql -U "$user" -d "$db" -v ON_ERROR_STOP=1 -f - <"$file" 2>&1)"; then
      echo "$err" | grep -v '^$' || true
      return 0
    fi
    if is_transient_psql_err "$err"; then
      echo "migrate retry ${attempt}/${max} ($(basename "$file")): postgres not ready yet" >&2
      sleep 2
      attempt=$((attempt + 1))
      continue
    fi
    echo "$err" >&2
    exit 1
  done
  echo "FAIL: migrate $(basename "$file") -> $db after ${max} transient retries" >&2
  echo "$err" >&2
  exit 1
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
