# RD0 baseline (2026-08-29)

Internal gate notes for role-debug program RD1–RD11. Do not treat as product documentation.

Product docs: [docs/README.md](docs/README.md).

## Gate status

| Check | Result |
|-------|--------|
| `make compose-up` (+ `compose-fe-smoke`) | green |
| `cd vdp/fe && npm test` | 93/93 green (post-Lovable RI + B.2 FE helpers) |
| `make test` (core+hub) | green |
| `make compose-e2e` / `make integration-gate` | green (main + RD7/8/9 spots) |
| `/login` (http://127.0.0.1:5173/login) | HTTP 200 |

## Stack

- UI: http://localhost:5173
- API core: http://localhost:8080
- Hub: http://localhost:8081
- `STORE_DRIVER=postgres`

## Seed IDs (from `vdp/core/internal/repository/seed/seed.go`)

| Constant | UUID | Notes |
|----------|------|--------|
| UserID | `11111111-1111-1111-1111-111111111111` | user@vdp.local / user |
| ManagerID | `22222222-2222-2222-2222-222222222222` | manager@vdp.local / manager |
| ICOID | `33333333-3333-3333-3333-333333333333` | ico@vdp.local / ico |
| ECOID | `44444444-4444-4444-4444-444444444444` | eco@vdp.local / eco |
| ProviderID | `55555555-5555-5555-5555-555555555555` | provider@vdp.local / provider (compose-e2e assign) |
| OrgID | `66666666-6666-6666-6666-666666666666` | user org «ООО Пример» (ICO approve in e2e) |
| BankID | `77777777-7777-7777-7777-777777777777` | bank@vdp.local / bank |
| BankOrgID | `88888888-8888-8888-8888-888888888888` | bank client org (bank forms only) |
| RootID | `99999999-9999-9999-9999-999999999999` | root@vdp.local / root |

Also: `root@vdp.local` / `root` (app superadmin; seeded in `seed.go` since RD8).

## Gate fix applied during RD0

`vdp/scripts/compose-fe-smoke.sh` used the first org from **user** list (`OrgID`) for bank create → 403 «bank client may only create forms for own organization».
Fixed: use `BANK_ORG_ID` default `88888888-8888-8888-8888-888888888888`.

## Bug table (RD1+)

| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix |
|------|---------|--------|-----|----------|--------|-------|-----|
| user | (create) | creating | create+contract | attach as user | 403 ManualAttach | FE store | `attachDocToForm(..., "contract")` |
| user | * | contract_waiting | upload_contract | user_upload_contract | order_signing (mgr) | bridge+core | `user_upload_contract` + FILE_THEN_TRANSITION |
| user | * | signing_order_accepted | upload_payments | file attach only | payment_received | bridge | `file_attach` / MetaPayments |
| user | (create) | — | list match | create id = list id | hex vs dashed UUID | core newID + FE normalize | dashed UUID + `normalizeFormId` |
| user | * | registry | visible own | ACL list + session stamp | ownerName filter hid «—» | FE visibleForms | allow placeholder owner |
| ico | * | org blocked | approve lock | orgBlocksApproval | status mapped to not_approved | FE mapper | `mapOrgStatus` keeps `blocked` |
| ico | * | org approve after block | user can login | account unblocked | account stayed blocked | core Approve | unblock account on Approve |
| manager | * | contract_verification | mgr_contract_confirm | signing_order | resolve → contract_waiting | FE store | status-aware confirm → manager_send_order |
| manager | * | payment_received | mgr_payment_start | blocked until provider | API allows without provider | FE ActionPanel | gate on missing provider_id |
| manager | * | report_waiting | upload_report | report_waiting_verification | 409 transition blocked | core transitions | add report_waiting → report_waiting_verification |
| manager | * | report_accepted | mgr_shipment_waiting | shipment_waiting | 409 transition blocked | core transitions | add report_accepted → shipment_waiting |

## RD1 verify (2026-08-29)

- create → `recognize_complete` → **draft**; create id dashed; form appears in `GET /forms`
- submit (org not approved) → `organization_waiting_verification`
- file-store upload + `docs/attach` (payment) OK; wrong-status `user_upload_contract` → 409; user `payment_received` → 403
- `npm test` + `go test` formpayment/service green

## RD2 verify (2026-08-29)

- un-approve → submit → `organization_waiting_verification` → `ico_start` → `ico_reject` → `form_waiting_corrections`
- approve org + `ico_start` → `ico_approve` → `form_waiting_verification`
- FE gating: hard lock on blocked; soft lock accept when subjects pending; ICO note on pending org
- `npm test` 40; organization Go tests green

## RD3 verify (2026-08-29)

- `eco_start` → `eco_accept` → `form_accepted`; user cannot eco_start (403)
- `eco_reject` → `form_waiting_corrections` → user `submit` → `form_waiting_verification`
- FE: reject banner from history (`rejectFromHistory`); ECO queue via visibleForms form_*
- `npm test` 45

## RD4 verify (2026-08-29)

- `form_accepted` → assign agent → `contract_waiting`; manual `contract/attach` → `signing_order`
- user `user_upload_contract` → `contract_verification`; `mgr_contract_confirm` → `manager_send_order` → `signing_order`
- user `user_upload_order` → `signing_order_waiting_verification` → `order_start` → `order_accept` → **signing_order_accepted**
- contract return with `contract_id`: reject + resolve → `contract_waiting_correction`
- `npm test` 52

## RD5 verify (2026-08-29)

- `signing_order_accepted` → `payment_received` → assign provider → `payment_start` → `payment_processing` → provider `provider_sent` → `payment_sent`
- provider `provider_return` → `manager_checking`; `payment_start` resumes execution
- refund: `refund/init` → `refund/start` → `refund/file` → `refund/sent`; GET `/forms/{id}/refund` shows `unrefunded_blocks_cancel`
- `cancel_by_manager` with active refund → **409** «cannot finalize cancel while funds are unrefunded»
- FE: `mgr_payment_start` gated until `provider_id` on `payment_received`; RefundPanel shows block banner
- `npm test` 60

## RD6 verify (2026-08-29)

- Full close on one form id: `payment_sent` → `report_signing` → user `report_upload` → `report_start` → `report_accept` → `shipment_waiting` → user `shipment_upload` → `shipment_start` → **completed**
- Core fix: allow `report_waiting` → `report_waiting_verification` and `report_accepted` → `shipment_waiting`
- Nest shortcut still valid: `report/accept` → `completed` (compose-e2e)
- Dashboard: `completed` excluded from `isActive` / stuck count
- `npm test` 64; formpayment domain tests green

## RD7 verify (2026-08-29)

- Provider registry: no «Клиент» column; CSV/search omit `ownerName`; no «Создать заявку»
- Provider card: payment requisites (org/INN, counterparty bank/SWIFT) without legal address / participants block; payment docs only; no RefundPanel
- Actions: `prov_payment_start` → `payment_processing`; `prov_attach_proof` → `set_confirmation`; `prov_payment_sent` → `payment_sent`; `prov_payment_return` → `manager_checking`
- API: compose-e2e `provider/form-payment/{id}/payment/sent` after `payment/start`
- `npm test` 75 (provider-flow + ACL)

## RD8 verify (2026-08-29)

- Root dashboard: services/incidents/stuck forms + links to `/admin` and `/testing`
- `/admin` (app): list/create/patch accounts via API; block/unblock; delete/import disabled in app
- Root form card: union CTA + «Отменить заявку» in admin section → `cancel_by_manager`
- `/testing` (app): readable seed table (`*@vdp.local`), scenarios, forms matrix
- Core seed: `RootID` + `root@vdp.local` / `root` (upsert on core start)
- `npm test` 80 (root-flow)

## RD9 verify (2026-08-29)

- `compose-fe-smoke`: bank login + POST `/api/v1/bank/forms` (required gate)
- `/testing`: `smokeCreateBankForm` with `BANK_ORG_ID`, invalidates forms list
- Registry/detail: `ChannelBadge` «Канал: Bank API» + correlation id on card
- `/organizations`: `BankSettingsPanel` prefills org bank fields, invalidates on save
- `npm test` 84 (bank-channel)

## RD10 verify (2026-08-29)

- **UI journey contract:** `integration-journey.test.ts` — RD1→RD8 CTA matrix + bridge on one logical form lifecycle
- **Compose E2E:** main path `$ID` User→ICO→ECO→order→payment→provider_start→provider_sent→report→**completed**; refund 409 smoke on `$ID2`
- **RD7 spot:** parallel `$ID3` — `provider/payment/start` from `payment_received` → `payment_processing` → `payment/sent`
- **RD8 spot:** root `GET /admin/account`; draft `$ID4` → `cancel_by_manager` via root token
- **RD9 spot:** `POST /api/v1/bank/forms` → `channel=bank`
- **Gate command:** `make integration-gate` (= fe npm test 88 + go test + compose-e2e)
- **P0 closure:** all rows in bug table above have Fix column; no open P0 (Playwright browser E2E deferred to RD11)

## RD11 verify (2026-08-29)

- Playwright scaffold: `playwright.config.ts`, `e2e/fixtures/auth.fixture.ts`, `e2e/helpers/api.ts`
- Specs: `happy-path`, `reject-path`, `provider-acl`, `bank-badge` (6 tests)
- Gate: `make playwright-e2e` → `scripts/compose-playwright.sh` (Docker + compose network `fe:5173` / `core:8080`)
- Prerequisite: `make compose-up`; `vite.config.ts` `allowedHosts` includes `fe` for in-network dev server
