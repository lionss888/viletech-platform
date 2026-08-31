#!/usr/bin/env bash
# Bootstrap vdp_core / vdp_hub roles and databases for CI (GitHub Actions service or GitLab postgres service).
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGUSER="${POSTGRES_USER:-vdp}"
PGPASSWORD="${POSTGRES_PASSWORD:-vdp}"
export PGPASSWORD

until pg_isready -h "$PGHOST" -U "$PGUSER" >/dev/null 2>&1; do
  echo "waiting for postgres at $PGHOST..."
  sleep 1
done

psql -h "$PGHOST" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vdp_core') THEN
    CREATE ROLE vdp_core LOGIN PASSWORD 'vdp_core';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vdp_hub') THEN
    CREATE ROLE vdp_hub LOGIN PASSWORD 'vdp_hub';
  END IF;
END $$;
SQL

psql -h "$PGHOST" -U "$PGUSER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='vdp_core'" | grep -q 1 || \
  psql -h "$PGHOST" -U "$PGUSER" -d postgres -c "CREATE DATABASE vdp_core OWNER vdp_core;"
psql -h "$PGHOST" -U "$PGUSER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='vdp_hub'" | grep -q 1 || \
  psql -h "$PGHOST" -U "$PGUSER" -d postgres -c "CREATE DATABASE vdp_hub OWNER vdp_hub;"

echo "postgres bootstrap ok"
