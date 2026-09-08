#!/usr/bin/env bash
# Shared continuity helpers for compose-e2e (pilot: ICO/ECO slots may be off).
# Caller must set: BASE, ORG_ID, USER_T, ICO_T, ECO_T, MGR_T
# shellcheck shell=bash

# Soft PUT: true on 2xx (for pilot continuity fallbacks). Does not exit on failure.
try_put() {
  local token="$1" path="$2" body="${3:-{}}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$BASE$path" \
    -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body")
  [[ "$code" =~ ^2 ]]
}

# Soft POST: true on 2xx.
try_post() {
  local token="$1" path="$2" body="${3:-{}}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE$path" \
    -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body")
  [[ "$code" =~ ^2 ]]
}

form_status() {
  local token="$1" path="$2"
  curl -sf -H "Authorization: Bearer $token" "$BASE$path" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])'
}

# Advance form to form_accepted. Prefer ICO/ECO role routes; on 403 (slot off) use manager continuity.
advance_compliance() {
  local id="$1"
  local st
  st=$(form_status "$USER_T" "/api/v1/site/form-payment/$id")
  if [[ "$st" == "organization_waiting_verification" || "$st" == "organization_verification" ]]; then
    try_put "$ICO_T" "/api/v1/admin/internal-compliance-officer/organization/$ORG_ID/approve" || true
    if ! try_put "$ICO_T" "/api/v1/ico/form-payment/$id/form/start"; then
      if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/ico_start" '{}'; then
        echo "FAIL ico_start continuity for form=$id" >&2
        exit 1
      fi
    fi
    if ! try_put "$ICO_T" "/api/v1/ico/form-payment/$id/form/accept"; then
      if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/ico_approve" '{}'; then
        echo "FAIL ico_approve continuity for form=$id" >&2
        exit 1
      fi
    fi
  elif [[ "$st" != "form_waiting_verification" && "$st" != "form_verification" && "$st" != "form_accepted" ]]; then
    echo "FAIL compliance entry status=$st for form=$id" >&2
    exit 1
  fi
  st=$(form_status "$USER_T" "/api/v1/site/form-payment/$id")
  if [[ "$st" == "form_accepted" ]]; then
    return 0
  fi
  if ! try_put "$ECO_T" "/api/v1/eco/form-payment/$id/form/start"; then
    if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/eco_start" '{}'; then
      echo "FAIL eco_start continuity for form=$id" >&2
      exit 1
    fi
    if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/eco_accept" '{}'; then
      echo "FAIL eco_accept continuity for form=$id" >&2
      exit 1
    fi
    return 0
  fi
  if ! try_put "$ECO_T" "/api/v1/eco/form-payment/$id/form/accept"; then
    if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/eco_accept" '{}'; then
      echo "FAIL eco_accept continuity for form=$id" >&2
      exit 1
    fi
  fi
}

# Reject to form_waiting_corrections (ECO route or manager continuity).
reject_to_corrections() {
  local id="$1"
  local body='{"reason":"RH2: уточните контракт","mark":"docs","comment":"RH2: уточните контракт"}'
  local st
  st=$(form_status "$USER_T" "/api/v1/site/form-payment/$id")
  if [[ "$st" == "organization_waiting_verification" || "$st" == "organization_verification" ]]; then
    try_put "$ICO_T" "/api/v1/admin/internal-compliance-officer/organization/$ORG_ID/approve" || true
    if ! try_put "$ICO_T" "/api/v1/ico/form-payment/$id/form/start"; then
      try_post "$MGR_T" "/api/v1/forms/$id/actions/ico_start" '{}' || true
    fi
    if ! try_put "$ICO_T" "/api/v1/ico/form-payment/$id/form/accept"; then
      try_post "$MGR_T" "/api/v1/forms/$id/actions/ico_approve" '{}' || true
    fi
    st=$(form_status "$USER_T" "/api/v1/site/form-payment/$id")
  fi
  if [[ "$st" == "form_waiting_verification" || "$st" == "form_verification" ]]; then
    if [[ "$st" == "form_waiting_verification" ]]; then
      if ! try_put "$ECO_T" "/api/v1/eco/form-payment/$id/form/start"; then
        try_post "$MGR_T" "/api/v1/forms/$id/actions/eco_start" '{}' || true
      fi
    fi
    if ! try_put "$ECO_T" "/api/v1/eco/form-payment/$id/form/reject" "$body"; then
      if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/eco_reject" "$body"; then
        echo "FAIL eco_reject continuity for form=$id" >&2
        exit 1
      fi
    fi
    return 0
  fi
  if [[ "$st" == "form_accepted" ]]; then
    if ! try_post "$MGR_T" "/api/v1/forms/$id/actions/manager_form_reject" "$body"; then
      echo "FAIL manager_form_reject for form=$id" >&2
      exit 1
    fi
    return 0
  fi
  echo "FAIL reject entry status=$st for form=$id" >&2
  exit 1
}
