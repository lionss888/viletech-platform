#!/usr/bin/env bash
# Compose E2E: User → ICO → ECO → order → payment → provider sent → report → completed
# (+ refund cancel-invariant smoke on a second form).
set -euo pipefail

BASE="${CORE_URL:-http://127.0.0.1:8080}"
HUB="${HUB_URL:-http://127.0.0.1:8081}"
S2S="${HUB_SHARED_SECRET:-vdp-s2s-dev-secret}"

login() {
  local email="$1" pass="$2"
  curl -sf -X POST "$BASE/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
}

auth_put() {
  local token="$1" path="$2"
  curl -sf -X PUT "$BASE$path" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{}' >/dev/null
}

auth_post() {
  local token="$1" path="$2" body="$3"
  curl -sf -X POST "$BASE$path" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body"
}

form_status() {
  local token="$1" path="$2"
  curl -sf -H "Authorization: Bearer $token" "$BASE$path" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])'
}

# ICO path when org pending; ECO-only when seed org already approved (repeatable e2e).
advance_compliance() {
  local id="$1"
  local st
  st=$(form_status "$USER_T" "/api/v1/site/form-payment/$id")
  if [[ "$st" == "organization_waiting_verification" ]]; then
    auth_put "$ICO_T" "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve"
    auth_put "$ICO_T" "/api/v1/ico/form-payment/$id/form/start"
    auth_put "$ICO_T" "/api/v1/ico/form-payment/$id/form/accept"
  elif [[ "$st" != "form_waiting_verification" && "$st" != "form_verification" && "$st" != "form_accepted" ]]; then
    echo "FAIL compliance entry status=$st for form=$id" >&2
    exit 1
  fi
  auth_put "$ECO_T" "/api/v1/eco/form-payment/$id/form/start"
  auth_put "$ECO_T" "/api/v1/eco/form-payment/$id/form/accept"
}

echo "== health =="
curl -sf "$BASE/api/v1/health" >/dev/null
curl -sf "$HUB/api/v1/health" >/dev/null
echo "core+hub ok"

echo "== login roles =="
USER_T=$(login user@vdp.local user)
ICO_T=$(login ico@vdp.local ico)
ECO_T=$(login eco@vdp.local eco)
MGR_T=$(login manager@vdp.local manager)
PROV_T=$(login provider@vdp.local provider)

echo "== create form =="
FORM=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"500","no_documents":true,"contract_number":"COMPOSE-E2E","contract_date":"2026-08-01"}')
ID=$(echo "$FORM" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
echo "form=$ID"

auth_post "$USER_T" "/api/v1/forms/$ID/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID/form/accept"
advance_compliance "$ID"

AGENT=$(auth_post "$MGR_T" /api/v1/agents '{"name":"Compose Agent","inn":"1"}')
AID=$(echo "$AGENT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$MGR_T" "/api/v1/forms/$ID/agent" "{\"agent_id\":\"$AID\"}" >/dev/null
auth_post "$MGR_T" "/api/v1/forms/$ID/rate" '{"value":"90","currency":"USD","source":"manual"}' >/dev/null
auth_post "$MGR_T" "/api/v1/forms/$ID/commission" '{"fee_percent":"1.5","fee_currency":"USD"}' >/dev/null
auth_post "$MGR_T" "/api/v1/forms/$ID/provider" '{"provider_id":"55555555-5555-5555-5555-555555555555","client_agreed":true}' >/dev/null

auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/order/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID/order"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/order/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/order/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/payment/received"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/payment/start"
auth_put "$PROV_T" "/api/v1/provider/form-payment/$ID/payment/start"
auth_put "$PROV_T" "/api/v1/provider/form-payment/$ID/payment/sent"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/report/signing"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/report/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID/completed"

STATUS=$(curl -sf -H "Authorization: Bearer $MGR_T" "$BASE/api/v1/manager/form-payment/$ID" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])')
if [[ "$STATUS" != "completed" ]]; then
  echo "FAIL main path status=$STATUS want completed" >&2
  exit 1
fi
echo "main path completed"

echo "== refund smoke =="
FORM2=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"EUR","invoice_amount":"100","no_documents":true}')
ID2=$(echo "$FORM2" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID2/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID2/form/accept"
# Org already approved → ECO path
auth_put "$ECO_T" "/api/v1/eco/form-payment/$ID2/form/start"
auth_put "$ECO_T" "/api/v1/eco/form-payment/$ID2/form/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID2/order/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID2/order"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID2/order/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID2/order/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID2/payment/received"
auth_post "$MGR_T" "/api/v1/manager/form-payment/$ID2/refund/init" \
  '{"amount":"100","currency":"EUR","comment":"compose refund"}' >/dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$BASE/api/v1/manager/form-payment/$ID2/cancel" \
  -H "Authorization: Bearer $MGR_T" -H 'Content-Type: application/json' -d '{}')
if [[ "$CODE" != "409" ]]; then
  echo "FAIL cancel with unrefunded funds want 409 got $CODE" >&2
  exit 1
fi

echo "== RD7 provider_start spot (parallel form) =="
FORM3=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"200","no_documents":true,"contract_number":"RD7-SPOT"}')
ID3=$(echo "$FORM3" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID3/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID3/form/accept"
auth_put "$ECO_T" "/api/v1/eco/form-payment/$ID3/form/start"
auth_put "$ECO_T" "/api/v1/eco/form-payment/$ID3/form/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID3/order/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID3/order"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID3/order/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID3/order/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID3/payment/received"
auth_post "$MGR_T" "/api/v1/forms/$ID3/provider" '{"provider_id":"55555555-5555-5555-5555-555555555555","client_agreed":true}' >/dev/null
auth_put "$PROV_T" "/api/v1/provider/form-payment/$ID3/payment/start"
ST3=$(curl -sf -H "Authorization: Bearer $PROV_T" "$BASE/api/v1/provider/form-payment/$ID3" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])')
if [[ "$ST3" != "payment_processing" ]]; then
  echo "FAIL RD7 provider_start status=$ST3 want payment_processing" >&2
  exit 1
fi
auth_put "$PROV_T" "/api/v1/provider/form-payment/$ID3/payment/sent"
echo "RD7 provider_start spot ok form=$ID3"

echo "== RD8 root cancel + admin spot =="
ROOT_T=$(login root@vdp.local root)
curl -sf -H "Authorization: Bearer $ROOT_T" "$BASE/api/v1/admin/account" | python3 -c 'import sys,json; d=json.load(sys.stdin); assert isinstance(d,list) and len(d)>0'
FORM4=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"RUB","invoice_amount":"50","no_documents":true,"contract_number":"RD8-CANCEL"}')
ID4=$(echo "$FORM4" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID4/actions/recognize_complete" '{}' >/dev/null
curl -sf -X PUT "$BASE/api/v1/manager/form-payment/$ID4/cancel" \
  -H "Authorization: Bearer $ROOT_T" -H 'Content-Type: application/json' \
  -d '{"reason":"RD10 integration gate"}' >/dev/null
ST4=$(curl -sf -H "Authorization: Bearer $ROOT_T" "$BASE/api/v1/manager/form-payment/$ID4" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])')
if [[ "$ST4" != "canceled_by_manager" ]]; then
  echo "FAIL RD8 root cancel status=$ST4 want canceled_by_manager" >&2
  exit 1
fi
echo "RD8 root cancel spot ok form=$ID4"

echo "== RD9 bank channel spot =="
BANK_ORG_ID="${BANK_ORG_ID:-88888888-8888-8888-8888-888888888888}"
BANK_T=$(login bank@vdp.local bank)
BANK_FORM=$(curl -sf -X POST "$BASE/api/v1/bank/forms" \
  -H "Authorization: Bearer $BANK_T" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: rd10-gate-$(date +%s)" \
  -d "{\"organization_id\":\"$BANK_ORG_ID\",\"invoice_amount\":\"100\",\"currency\":\"USD\",\"contract_number\":\"RD10-BANK\",\"contract_date\":\"2026-08-01\",\"correlation_id\":\"rd10-gate\"}")
BCH=$(echo "$BANK_FORM" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("channel",""))')
if [[ "$BCH" != "bank" ]]; then
  echo "FAIL RD9 bank channel=$BCH want bank" >&2
  exit 1
fi
echo "RD9 bank spot ok"

curl -sf -X POST "$BASE/api/v1/internal/outbox/flush" -H "X-VDP-S2S: $S2S" >/dev/null
echo "RD10 compose E2E green (main=$ID RD7=$ID3 RD8=$ID4)"
