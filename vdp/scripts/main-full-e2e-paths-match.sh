#!/usr/bin/env bash
# Exit 0 if stdin paths include fe e2e specs outside the narrow PR-smoke set.
# Those files run on main push full Playwright but not in ci-pr / @pilot-matrix-only gates.
set -euo pipefail

NARROW='e2e/(login-form|user-submit|provider-acl|reject-path)\.spec\.ts$'

matched=0
while IFS= read -r line || [ -n "$line" ]; do
  [ -z "$line" ] && continue
  case "$line" in
    vdp/fe/e2e/*|fe/e2e/*) ;;
    *) continue ;;
  esac
  if printf '%s\n' "$line" | grep -Eq "$NARROW"; then
    continue
  fi
  # Any other e2e path (spec, helper, fixture under e2e) escalates to full suite.
  matched=1
  break
done

[ "$matched" -eq 1 ]
