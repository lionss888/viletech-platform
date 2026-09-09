#!/usr/bin/env bash
# Compose E2E: User → compliance/manager continuity → order → payment → provider sent → report → completed
# (+ refund cancel-invariant smoke on a second form).
#
# Pilot process-roles (migration 017): ICO/ECO slots are off by default. Continuity spine
# lets manager advance disabled slots (same pattern as scenarioverify/executor.go and
# fe/e2e/helpers/api.ts). When slots are re-enabled, ECO/ICO paths still work.
#
# Shared scenario catalog IDs (vdp/core/internal/scenarioverify):
#   happy_path_to_completed — main path below
#   refund_smoke — refund smoke section
#   provider_payment_no_pii — RD7 provider_start spot
#   root_cancel — RD8 root cancel + admin spot
#   bank_channel_badge — RD9 bank channel spot
#   ico_org_pending_approve — RH2 ICO org-pending spot (un-approve; soft-skip forbidden)
#   eco_reject_resubmit — RH2 ECO/manager reject + user resubmit
#   provider_return_to_manager — provider returns payment to manager
#   manager_sets_deal_rate — manager POST /forms/{id}/rate
#   health_core — health curl at start
# Root on-demand runner: POST /api/v1/admin/scenario-runs (system.admin).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Continuity helpers (try_put/try_post/form_status/advance_compliance/reject_to_corrections).
# shellcheck source=lib/e2e-continuity.sh
source "$SCRIPT_DIR/lib/e2e-continuity.sh"

BASE="${CORE_URL:-http://127.0.0.1:8080}"
HUB="${HUB_URL:-http://127.0.0.1:8081}"
S2S="${HUB_SHARED_SECRET:-vdp-s2s-dev-secret}"
ORG_ID="${ORG_ID:-66666666-6666-6666-6666-666666666666}"

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

auth_put_json() {
  local token="$1" path="$2" body="$3"
  curl -sf -X PUT "$BASE$path" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body" >/dev/null
}

auth_post() {
  local token="$1" path="$2" body="$3"
  curl -sf -X POST "$BASE$path" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body"
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

echo "== docs generate (B.2) =="
auth_post "$MGR_T" "/api/v1/forms/$ID/docs/generate" '{"kind":"import_order"}' >/dev/null
curl -sf -X POST "$BASE/api/v1/internal/outbox/flush" -H "X-VDP-S2S: $S2S" >/dev/null
export MGR_T ID BASE
python3 - <<'PY'
import json, os, sys, urllib.request
base = os.environ.get("BASE", "http://127.0.0.1:8080")
token = os.environ["MGR_T"]
form_id = os.environ["ID"]
req = urllib.request.Request(
    f"{base}/api/v1/forms/{form_id}",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req) as resp:
    form = json.load(resp)
docs = form.get("docs_json") or ""
pog_file = form.get("pog_file_id") or ""
pog_status = form.get("pog_status") or ""
if pog_status == "success" and pog_file:
    print(f"docs generate ok pog_file_id={pog_file}")
elif "success" in docs and (".pdf" in docs or pog_file):
    print("docs generate ok (docs_json)")
else:
    print(f"FAIL docs generate docs_json={docs!r} pog_status={pog_status!r} pog_file_id={pog_file!r}", file=sys.stderr)
    sys.exit(1)
PY

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
advance_compliance "$ID2"
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
advance_compliance "$ID3"
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

echo "== RH2 ICO org-pending spot (soft_skip_forbidden) =="
# Force org into unverified state so the scenario cannot soft-skip.
try_put "$ICO_T" "/api/v1/admin/internal-compliance-officer/organization/$ORG_ID/un-approve" || true
FORM5=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"120","no_documents":true,"contract_number":"RH2-ICO"}')
ID5=$(echo "$FORM5" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID5/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID5/form/accept"
ST5=$(form_status "$USER_T" "/api/v1/site/form-payment/$ID5")
if [[ "$ST5" != "organization_waiting_verification" && "$ST5" != "organization_verification" ]]; then
  echo "FAIL RH2 ICO entry status=$ST5 form=$ID5 want organization_waiting_verification after un-approve" >&2
  exit 1
fi
try_put "$ICO_T" "/api/v1/admin/internal-compliance-officer/organization/$ORG_ID/approve" || true
try_post "$MGR_T" "/api/v1/organizations/$ORG_ID/approve" '{}' || true
if ! try_put "$ICO_T" "/api/v1/ico/form-payment/$ID5/form/start"; then
  try_post "$MGR_T" "/api/v1/forms/$ID5/actions/ico_start" '{}' || true
fi
if ! try_put "$ICO_T" "/api/v1/ico/form-payment/$ID5/form/accept"; then
  try_post "$MGR_T" "/api/v1/forms/$ID5/actions/ico_approve" '{}' || true
fi
ST5B=$(form_status "$USER_T" "/api/v1/site/form-payment/$ID5")
if [[ "$ST5B" != "form_waiting_verification" && "$ST5B" != "form_verification" && "$ST5B" != "form_accepted" ]]; then
  echo "FAIL RH2 ICO continuity status=$ST5B form=$ID5" >&2
  exit 1
fi
echo "RH2 ICO org-pending path ok form=$ID5 status=$ST5B"

echo "== RH2 ECO/manager reject + user resubmit =="
FORM6=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"130","no_documents":true,"contract_number":"RH2-REJECT"}')
ID6=$(echo "$FORM6" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID6/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID6/form/accept"
reject_to_corrections "$ID6"
ST6=$(form_status "$USER_T" "/api/v1/site/form-payment/$ID6")
if [[ "$ST6" != "form_waiting_corrections" ]]; then
  echo "FAIL RH2 reject status=$ST6 want form_waiting_corrections" >&2
  exit 1
fi
auth_put "$USER_T" "/api/v1/site/form-payment/$ID6/form/accept-corrections"
ST6B=$(form_status "$USER_T" "/api/v1/site/form-payment/$ID6")
if [[ "$ST6B" != "form_waiting_verification" && "$ST6B" != "form_verification" ]]; then
  echo "FAIL RH2 resubmit status=$ST6B" >&2
  exit 1
fi
echo "RH2 reject/resubmit ok form=$ID6"

echo "== RH2 refund full cycle =="
FORM7=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"1000","no_documents":true,"contract_number":"RH2-REFUND"}')
ID7=$(echo "$FORM7" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID7/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID7/form/accept"
advance_compliance "$ID7"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID7/order/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID7/order"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID7/order/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID7/order/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID7/payment/received"
auth_post "$MGR_T" "/api/v1/manager/form-payment/$ID7/refund/init" \
  '{"amount":"1000","currency":"USD","comment":"RH2 full refund"}' >/dev/null
auth_post "$MGR_T" "/api/v1/forms/$ID7/refund/file" '{"file_id":"rf-rh2-1"}' >/dev/null
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID7/refund/start"
auth_post "$MGR_T" "/api/v1/forms/$ID7/refund/sent" '{"comment":"RH2 sent"}' >/dev/null
ST7=$(form_status "$MGR_T" "/api/v1/manager/form-payment/$ID7")
if [[ "$ST7" != "payment_refund_sent" ]]; then
  echo "FAIL RH2 refund full status=$ST7 want payment_refund_sent" >&2
  exit 1
fi
echo "RH2 refund full ok form=$ID7"

echo "== P5 advance_signing smoke =="
FORM8=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"800","no_documents":true,"contract_number":"P5-ADV"}')
ID8=$(echo "$FORM8" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID8/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID8/form/accept"
advance_compliance "$ID8"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/order/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID8/order"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/order/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/order/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/order-advance/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID8/order-advance"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/order-advance/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/order-advance/accept"
ST8=$(form_status "$MGR_T" "/api/v1/manager/form-payment/$ID8")
if [[ "$ST8" != "advance_signing_order_accepted" ]]; then
  echo "FAIL P5 advance status=$ST8 want advance_signing_order_accepted" >&2
  exit 1
fi
echo "P5 advance_signing ok form=$ID8"

echo "== P5 shipment smoke =="
auth_post "$MGR_T" "/api/v1/forms/$ID8/provider" '{"provider_id":"55555555-5555-5555-5555-555555555555","client_agreed":true}' >/dev/null
auth_post "$MGR_T" "/api/v1/manager/form-payment/$ID8/shipment/waiting" '{}' >/dev/null
ST8B=$(form_status "$MGR_T" "/api/v1/manager/form-payment/$ID8")
if [[ "$ST8B" != "shipment_waiting" ]]; then
  echo "FAIL P5 shipment_waiting status=$ST8B" >&2
  exit 1
fi
auth_put "$USER_T" "/api/v1/site/form-payment/$ID8/shipment"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/shipment/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID8/shipment/accept"
ST8C=$(form_status "$MGR_T" "/api/v1/manager/form-payment/$ID8")
if [[ "$ST8C" != "completed" ]]; then
  echo "FAIL P5 shipment accept status=$ST8C want completed" >&2
  exit 1
fi
echo "P5 shipment ok form=$ID8"

echo "== provider_return_to_manager =="
# Re-approve org for subsequent forms (ICO spot left it approved; ensure baseline).
try_put "$ICO_T" "/api/v1/admin/internal-compliance-officer/organization/$ORG_ID/approve" || true
FORM9=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"640","no_documents":true,"contract_number":"PROV-RET"}')
ID9=$(echo "$FORM9" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID9/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID9/form/accept"
advance_compliance "$ID9"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID9/order/signing"
auth_put "$USER_T" "/api/v1/site/form-payment/$ID9/order"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID9/order/start"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID9/order/accept"
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID9/payment/received"
auth_post "$MGR_T" "/api/v1/forms/$ID9/provider" \
  '{"provider_id":"55555555-5555-5555-5555-555555555555","client_agreed":true}' >/dev/null
auth_put "$MGR_T" "/api/v1/manager/form-payment/$ID9/payment/start"
auth_put "$PROV_T" "/api/v1/provider/form-payment/$ID9/payment/start"
auth_put "$PROV_T" "/api/v1/provider/form-payment/$ID9/form/manager"
ST9=$(form_status "$MGR_T" "/api/v1/manager/form-payment/$ID9")
if [[ "$ST9" != "manager_checking" ]]; then
  echo "FAIL provider_return status=$ST9 want manager_checking form=$ID9" >&2
  exit 1
fi
echo "provider_return_to_manager ok form=$ID9"

echo "== manager_sets_deal_rate =="
FORM10=$(auth_post "$USER_T" /api/v1/site/form-payment \
  '{"currency":"USD","invoice_amount":"410","no_documents":true,"contract_number":"DEAL-RATE"}')
ID10=$(echo "$FORM10" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
auth_post "$USER_T" "/api/v1/forms/$ID10/actions/recognize_complete" '{}' >/dev/null
auth_put "$USER_T" "/api/v1/site/form-payment/$ID10/form/accept"
advance_compliance "$ID10"
auth_post "$MGR_T" "/api/v1/forms/$ID10/rate" '{"value":"92.5","currency":"RUB","source":"manual"}' >/dev/null
RATE_VAL=$(curl -sf "$BASE/api/v1/manager/form-payment/$ID10" -H "Authorization: Bearer $MGR_T" \
  | python3 -c 'import sys,json; r=json.load(sys.stdin).get("rate") or {}; print(r.get("value") or "")')
if [[ -z "$RATE_VAL" ]]; then
  echo "FAIL manager_sets_deal_rate empty rate form=$ID10" >&2
  exit 1
fi
echo "manager_sets_deal_rate ok form=$ID10 rate=$RATE_VAL"

curl -sf -X POST "$BASE/api/v1/internal/outbox/flush" -H "X-VDP-S2S: $S2S" >/dev/null
echo "RH10 compose E2E green (main=$ID RD7=$ID3 RD8=$ID4 RH2=$ID6 P5=$ID8 ret=$ID9 rate=$ID10)"
