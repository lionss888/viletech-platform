# BDUI experiment notes

## Scope measured

- Roles: User, Internal CO, External CO, Manager, Provider (P0–P7)
- Screens: login, forms.list, forms.create, forms.detail
- Layer: Nest `bdui` module + Vite/React renderer

## Local setup status (2026-08-25)

| Item | Status |
|------|--------|
| `.env` (Redis 6380, NATS 127.0.0.1) | Created |
| docker compose (mongo/redis/nats/gotenberg/minio) | Up (when Docker running) |
| P0–P6 happy-path import+аванс → COMPLETED | Done |
| P7 corrections / cancel / postpay branches | Done (see LIFECYCLE.md) |
| Seed 5 roles + org + stubs | `scripts/seed-bdui-lifecycle.js` |
| Checklist | [`LIFECYCLE.md`](LIFECYCLE.md) |
| E1 start-local + smoke | `./start-local.sh`, `scripts/smoke-bdui-login.js` |
| E2 file upload UI | `requiresFileUpload` + ActionBar picker (stubs только в seed) |
| E7 local object storage | MinIO `:9000`, bucket `fea360`; `scripts/smoke-bdui-upload.js` |
| E8 field fidelity | list/detail: `totals.amount`, `currency.client`; refresh after CTA |
| E9 operator UX | nav «К списку»; table sort; PDF/deal hints; empty list copy |
| E10 seed directories | currencies, 2 orgs, 2 counterparties, HS×2; wizard API refs |

Open UI: http://localhost:5173

## Seed directories (E10)

Re-seed: `cd backend-for-ved && node scripts/seed-bdui-lifecycle.js` (idempotent).

| Collection | Seed keys | Wizard / API |
|------------|-----------|--------------|
| `currencies` | symbol+source (rub/usd/eur/cny/usdt) | `GET /currency` → deal step selects |
| `organizations` | `6a8dbd04…001`, `…002` | `GET /organization` → org step |
| `counterparties` | `6a8dbd08…001` (CN), `…002` (RU) | `GET /counterparty/list` (API; wizard без CRUD) |
| `hs-codes` | 0101210000, 8471300000 | wizard HS PATCH |

Smoke: `node scripts/smoke-bdui-seed-directories.js`.

## Form DTO display map (E8)

Site/manager GET form-payment does **not** expose top-level `amount` / `currencyClient` for UI:

| UI label | API path |
|----------|----------|
| Статус | `status` |
| Сумма | `totals.amount` (minor units; BDUI `format: money_minor`) |
| Валюта | `currency.client` |
| Валюта контрагента | `currency.counterparty` |

Wizard PATCH still sends `amount` + `currencyClient`/`currencyCounterparty` (lowercase enum) into `/form-payment/{id}/form`.

## Operator UX (E9)

| Surface | Behavior |
|---------|----------|
| Create / detail | Breadcrumb «← К списку» → `/forms` (client `ScreenPage`, не отдельный schema widget) |
| List tables | `defaultSort` + clickable `sortableKeys` (client `DataTableWidget`) |
| User list default | `createdAt` desc |
| Staff queues | `updateDate` desc (External CO: `status` asc) |
| PDF uploads | Wizard + `ActionBarWidget`: application/pdf, max 15 Мб |
| Deal hints | Wizard step `deal` + User draft detail `deal_fields_hint` |

Schema fields: `BduiDataTableWidget.defaultSort`, `sortableKeys`, `emptyMessage`; `BduiField.hint`.

## Local MinIO (E7)

| Item | Value |
|------|-------|
| API | `http://127.0.0.1:9000` |
| Console | `http://127.0.0.1:9001` |
| Access key | `minioadmin` (local only) |
| Secret | `minioadmin` (local only) |
| Bucket | `fea360` |

`start-local.sh` writes these into `.env`. Nest `S3Service` uses path-style addressing against the endpoint. Without MinIO, upload PDF fails with «Failed to upload file».

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
| Unit BDUI | 79 passed |
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
