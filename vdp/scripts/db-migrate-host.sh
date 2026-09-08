#!/usr/bin/env bash
# Apply core/hub SQL migrations to host Postgres (CI service / local make db-migrate).
# Same lexical *.sql order as scripts/compose-db-migrate.sh — single source of migration set.
#
# Env (defaults match Makefile / CI):
#   PGHOST, DATABASE_URL_CORE, DATABASE_URL_HUB — unused; uses discrete PG* vars below
#   PGHOST (default localhost)
#   CORE user/db: vdp_core / vdp_core
#   HUB user/db: vdp_hub / vdp_hub
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE_MIG="$ROOT/core/migrations"
HUB_MIG="$ROOT/hub/migrations"
PGHOST="${PGHOST:-localhost}"

apply_core() {
  local file=$1
  echo "migrate: $(basename "$file") -> vdp_core"
  PGPASSWORD=vdp_core psql -h "$PGHOST" -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f "$file"
}

apply_hub() {
  local file=$1
  echo "migrate: $(basename "$file") -> vdp_hub"
  PGPASSWORD=vdp_hub psql -h "$PGHOST" -U vdp_hub -d vdp_hub -v ON_ERROR_STOP=1 -f "$file"
}

for f in "$CORE_MIG"/*.sql; do
  apply_core "$f"
done
for f in "$HUB_MIG"/*.sql; do
  apply_hub "$f"
done
echo "db-migrate-host green"
