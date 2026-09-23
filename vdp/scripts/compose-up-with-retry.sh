#!/usr/bin/env bash
# Retry a docker compose (or any) command for Desktop recreate races:
# - compose --wait sees old container exit 0 during recreate
# - "No such container" on full stack up after migrate
#
# Usage:
#   compose-up-with-retry.sh [--attempts N] [--sleep S] [--] cmd [args...]
set -euo pipefail

attempts=3
sleep_s=3
while [ $# -gt 0 ]; do
  case "$1" in
    --attempts)
      attempts=$2
      shift 2
      ;;
    --sleep)
      sleep_s=$2
      shift 2
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "usage: compose-up-with-retry.sh [--attempts N] [--sleep S] [--] cmd [args...]" >&2
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -eq 0 ]; then
  echo "usage: compose-up-with-retry.sh [--attempts N] [--sleep S] [--] cmd [args...]" >&2
  exit 2
fi

ok=0
i=1
while [ "$i" -le "$attempts" ]; do
  if "$@"; then
    ok=1
    break
  fi
  echo "compose-up-with-retry: attempt ${i}/${attempts} failed ($*), retrying in ${sleep_s}s..." >&2
  sleep "$sleep_s"
  i=$((i + 1))
done

if [ "$ok" != "1" ]; then
  echo "compose-up-with-retry: all ${attempts} attempts failed: $*" >&2
  exit 1
fi
