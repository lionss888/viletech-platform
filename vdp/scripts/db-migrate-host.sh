#!/usr/bin/env bash
# Apply core/hub SQL migrations to host Postgres (CI service / local make db-migrate).
# Same lexical *.sql order as compose-db-migrate.sh — single source of migration set.
#
# Env (defaults match Makefile / vdp-ci):
#   PGHOST, CORE_DIR, HUB_DIR optional; DATABASE credentials via PGPASSWORD_* or defaults.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE_MIG="${CORE_DIR:-$ROOT/core}/migrations"
HUB_MIG="${HUB_DIR:-$ROOT/hub}/migrations"
PGHOST="${PGHOST:-localhost}"

apply_core() {
  local file=$1
  echo "migrate: $(basename "$file") -> vdp_core"
  PGPASSWORD="${PGPASSWORD_CORE:-vdp_core}" psql -h "$PGHOST" -U vdp_core -d vdp_core \
    -v ON_ERROR_STOP=1 -f "$file"
}

apply_hub() {
  local file=$1
  echo "migrate: $(basename "$file") -> vdp_hub"
  PGPASSWORD="${PGPASSWORD_HUB:-vdp_hub}" psql -h "$PGHOST" -U vdp_hub -d vdp_hub \
    -v ON_ERROR_STOP=1 -f "$file"
}

shopt -s nullglob
core_files=("$CORE_MIG"/*.sql)
hub_files=("$HUB_MIG"/*.sql)
[[ ${#core_files[@]} -gt 0 ]] || { echo "FAIL: no core migrations in $CORE_MIG" >&2; exit 1; }
[[ ${#hub_files[@]} -gt 0 ]] || { echo "FAIL: no hub migrations in $HUB_MIG" >&2; exit 1; }

for f in "${core_files[@]}"; do
  apply_core "$f"
done
for f in "${hub_files[@]}"; do
  apply_hub "$f"
done
echo "db-migrate-host green (${#core_files[@]} core, ${#hub_files[@]} hub)"
