#!/usr/bin/env bash
# Smoke tests for CD shell scripts (syntax + compose release config).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for script in \
  scripts/ci-bootstrap-postgres.sh \
  scripts/image-build-push.sh \
  scripts/deploy-compose-release.sh \
  scripts/wait-release-health.sh \
  scripts/rollback-compose-release.sh \
  scripts/bootstrap-host.sh; do
  bash -n "$script"
  echo "syntax ok: $script"
done

make compose-release-config-check
echo "test-cd-scripts passed"
