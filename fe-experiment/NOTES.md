# BDUI experiment notes

## Scope measured

- Roles: User, Internal CO, External CO, Manager, Provider (P0–P7)
- Screens: login, forms.list, forms.create, forms.detail
- Layer: Nest `bdui` module + Vite/React renderer

## Local setup status (2026-08-25)

| Item | Status |
|------|--------|
| `.env` (Redis 6380, NATS 127.0.0.1) | Created |
| docker compose (mongo/redis/nats/gotenberg) | Up (when Docker running) |
| P0–P6 happy-path import+аванс → COMPLETED | Done |
| P7 corrections / cancel / postpay branches | Done (see LIFECYCLE.md) |
| Seed 5 roles + org + stubs | `scripts/seed-bdui-lifecycle.js` |
| Checklist | [`LIFECYCLE.md`](LIFECYCLE.md) |
| E1 start-local + smoke | `./start-local.sh`, `scripts/smoke-bdui-login.js` |
| E2 file upload UI | `requiresFileUpload` + ActionBar picker (stubs только в seed) |

Open UI: http://localhost:5173

## StageHash: advance vs postpay (import)

Source: `backend-for-ved/src/lib/constants/models/form-payment.constants.ts`

| Stage | Advance (`importAdvanceStagesHash`) | Postpay (`importPostpayStagesHash`) |
|-------|-------------------------------------|-------------------------------------|
| SIGNING_ORDER | form_accepted → signing_order_* | same |
| ADVANCE_SIGNING_ORDER | empty | advance_signing_order_* populated |
| WAITING_PAYMENT_FROM_CLIENT | signing_order_accepted | advance_signing_order_accepted, payment_sent (+ manager_checking loops) |
| SENDING_PAYMENT_TO_COUNTERPARTY | payment_received / processing / manager_checking | signing_order_accepted / processing / manager_checking |
| AGENT_REPORT | from **payment_sent** | from **payment_received** |
| SHIPMENT | after report_accepted | same (shipment after report) |

Practical BDUI mapping:

- **Advance close:** `payment_sent` → report → shipment → COMPLETED
- **Postpay close:** Provider first (`payment_processing` from `signing_order_accepted`), then client pay / optional advance order → `payment_received` → report → shipment → COMPLETED

## Known API / product gaps (P7)

1. **Import + postpay after `payment_sent`:** `checkTransit` for import overrides `PAYMENT_SENT` to mainly `manager_checking`; special allow for `report_waiting` only when `!platformPostpayMode`. With `platformPostpayMode=legacy` (auto on postpay), `report/signing` from `payment_sent` may 400 — use `payment/received` first then report (BDUI exposes both CTAs).
2. **`order-advance` cycle:** works from `payment_received` → `advance_signing_order` → user upload → start/accept → `advance_signing_order_accepted` → `payment/received` again if needed. From `payment_sent` on plain import (no `postpay_rate_on_pp`) may 400.
3. **Report requires `direction=import`:** forms without direction fall into export transition merge and block `payment_received → report_waiting`. Always set direction on create/PATCH before closing path.
4. **Manual manager contract attach:** API `POST /admin/contract` (auto ACCEPTED). BDUI `mgr_contract_attach` UI: PDF upload + number/date prompts; staticBody keeps seed agent/org/account (fresh seed fixed ObjectIds).
5. **Refund / bank API / субагент as full types** — out of scope (separate epic per plan).
6. **UI file path (E2+):** lifecycle CTAs use `requiresFileUpload` → `/file-store/upload/pdf`; seed stub file ids remain for seed data / offline API scripts only, not ActionBar UI.

## P7 QA results (2026-08-25)

| Check | Result |
|-------|--------|
| ECO reject → User accept-corrections | `form_waiting_corrections` → `form_waiting_verification` |
| User cancel / ECO cancel | `canceled_by_user` / `canceled_by_compliance_officer`; schema actions=0 |
| Schema: cancel requires text | yes |
| Schema: payment_sent postpay CTAs | report + advance_signing + payment_received + cancel |
| Advance-order start/accept | OK |
| Postpay → COMPLETED | Blocked without `direction`; with StageHash path documented — use import+postPayment + payment_received → report → shipment |
| Unit BDUI | 76 passed |
## Seed IDs (fixed)

| Constant | Id |
|----------|-----|
| User stub file | `6a8dbd010000000000000001` |
| Agent | `6a8dbd020000000000000001` |
| Contract | `6a8dbd030000000000000001` |
| Organization | `6a8dbd040000000000000001` |
| User account | `6a8dbd050000000000000001` |
| Manager stub file | `6a8dbd060000000000000001` |
| Provider account | `6a8dbd070000000000000001` |

User seed: `enablePostpay=true`.
Provider seed id is `defaultProviderId` on Manager assign CTA.
