#!/bin/sh
set -eu
SPA_PORT="${INTAKE_SPA_PORT:-3000}"
if [ -f /opt/intake-fe/server/index.mjs ]; then
  export INTAKE_CONSOLE_SPA_UPSTREAM="${INTAKE_CONSOLE_SPA_UPSTREAM:-http://127.0.0.1:${SPA_PORT}}"
  echo "starting intake FE (nitro) on ${SPA_PORT}"
  (cd /opt/intake-fe && NITRO_PORT="$SPA_PORT" PORT="$SPA_PORT" HOST=127.0.0.1 node server/index.mjs) &
fi
exec intake "$@"
