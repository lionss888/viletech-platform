# Lifecycle checklist (BDUI / fe-experiment)

Канонический happy-path: **import + аванс + товар**.

## Accounts (seed)

```bash
cd fe-experiment/backend-for-ved
node scripts/seed-bdui-lifecycle.js
```

| Email | Password (default) | Role |
|-------|--------------------|------|
| user@bdui.local | BduiUser2024! | user |
| ico@bdui.local | BduiLifecycle2024! | internal_compliance_officer |
| eco@bdui.local | BduiLifecycle2024! | compliance_officer |
| manager@bdui.local | BduiLifecycle2024! | manager |
| provider@bdui.local | BduiLifecycle2024! | provider |

Organization for User: `ООО BDUI Тест` (INN 7707083893), status `not_approved` (first deal → Internal CO).

## Schema API (P0)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/1.0/bdui/schema/{role}/login` | public |
| GET | `/api/1.0/bdui/schema/{role}/{page}?status=` | JWT |

Roles: `user`, `internal_compliance_officer`, `compliance_officer`, `manager`, `provider`.  
Pages (staff): `login`, `forms.list`, `forms.detail`. User also: `forms.create`.

## Quality gate P0

- [x] `npm test -- --testPathPattern=modules/bdui --no-coverage` (33 passed)
- [x] Seed script runs without error
- [ ] `GET …/bdui/schema/user/login` → 200 (requires `npm run dev`)
- [ ] `GET …/bdui/schema/manager/login` → 200 (requires `npm run dev`)
- [x] Matrix unit coverage: User / ICO / ECO / Manager / Provider + cross-role isolation

## Happy-path walkthrough (P1–P6)

1. [x] P1 User create + submit
2. [x] P2 Internal CO approve org
3. [x] P3 External CO accept form
4. [x] P4 Manager order + assign provider / payment start
5. [x] P5 Provider execute payment
6. [x] P6 User close docs + Manager COMPLETED

## Quality gate P1

- [x] Unit: schema builders create/list/detail (`npm test -- --testPathPattern=modules/bdui` — 37 passed)
- [x] Manual API: User seed → create → PATCH deal/org → invoice → `PUT …/form/accept` → `organization_waiting_verification`
- [x] Negativ: accept без обязательных полей → 400 с понятным `message`, UI показывает ошибку
- [x] Список User показывает созданную заявку; чужой site-кабинет не видит форму (404)
- [x] Самопроверка: accept разрешён User на `draft`/`creating` (матрица + detail schema)

## Quality gate P2

- [x] Unit: ICO queue/detail + matrix isolation (User/Manager без ICO CTA) — BDUI tests 42 passed
- [x] Manual: ICO login → queue → start → org approve → form accept → `form_waiting_verification`
- [x] Return: ICO reject → `form_waiting_corrections`; User schema показывает `accept_corrections`
- [x] User schema: `org_lock_review` / `org_lock_decided` после решения ICO
- [x] Manager schema на org-waiting: пустой action_bar (нет ICO CTA)

## Quality gate P3

- [x] Unit: ECO queue/detail + isolation (User без ECO CTA) — BDUI tests 45 passed
- [x] Seed: active HS code `0101210000` (loyalty `ok`) for ECO accept validation
- [x] Manual happy-path: ECO start → accept → `form_accepted`
- [x] Manual reject → `form_waiting_corrections` + `rejectText` виден User; schema `accept_corrections`
- [x] Cancel → `canceled_by_compliance_officer`; User re-submit запрещён; hint `eco_canceled_hint`
- [x] Идемпотентность: повторный accept → domain 400 (`Can not transit status from form_accepted`)

## Quality gate P4

- [x] Unit: Manager list/detail + matrix chain form_accepted → signing_order_* → payment_* — BDUI tests 51+ passed
- [x] Seed: Agent + accepted Contract + stub file; Provider account id printed
- [x] Manual: attach/signing → User upload_order CTA → order start/accept → assign provider → payment received/start → `payment_processing`
- [x] Provider queue видит заявку после assign
- [x] Order reject → `signing_order_waiting_corrections`; User CTA `upload_order`
- [x] Provider schema на `form_accepted`: без Manager CTA
- [x] `order/generate` wired (S3 may 500 locally → stub attach fallback)

## Quality gate P5

- [x] Unit/contract: `FormPaymentProviderViewDto` deny-list (no `account`/`manager`/org email-phone) — 63 tests with BDUI
- [x] Unit: Provider matrix only on payment_* / signing_order_accepted; empty on `manager_checking`
- [x] Manual: attach proof → `payment/sent` → `payment_sent`
- [x] Return → `manager_checking`; Manager CTA `mgr_payment_start`; Provider execute запрещён
- [x] Чужая заявка другого provider → 404

## Quality gate P6

- [x] Unit: User/Manager closing statuses (report/shipment) + empty CTAs on `COMPLETED` — BDUI tests 70 passed
- [x] Manual: `payment_sent` → report signing → User report → report start/accept → User shipment → shipment start/accept → `COMPLETED`
- [x] Регрессия: после `COMPLETED` User/Provider/Manager schema без mutate CTA
- [x] Аванс: отгрузка (`shipment/accept` + stub `addClosing`) обязательна до complete
- [x] Самопроверка: финальный переход только Manager `shipment/accept` / `completed` из `shipment_verification`

## Branches (P7)

- [x] Corrections ECO↔User
- [x] Cancel (User / ECO)
- [x] Postpay path

## Quality gate P7

- [x] Unit: corrections/cancel/postpay statuses + empty CTAs on canceled/COMPLETED — BDUI tests 76 passed
- [x] Manual: ECO reject → `form_waiting_corrections` → User `accept-corrections` → `form_waiting_verification`
- [x] Manual: User cancel + ECO cancel → terminal status, schema without mutate CTA
- [x] Manual/docs: postpay StageHash checklist + BDUI actions (`NOTES.md`); advance-order cycle OK; full COMPLETED needs `direction=import` (blocker documented if missing)
- [x] Регрессия: advance happy-path actions still resolve (matrix + schemas)
- [x] Самопроверка StageHash advance vs postpay зафиксирована в `NOTES.md`

## UI readiness (E1–E6)

Строгий DoD: запуск → lifecycle в UI → ручной тест 5 ролей → работа с заявками.

### Quality gate E1 — One-click launch

- [x] `./fe-experiment/start-local.sh` (compose + .env Redis 6380 + seed)
- [x] README на 5 ролей + role picker / logout
- [x] `node scripts/smoke-bdui-login.js` (Nest up) — 5 login + schema login/list (accepts HTTP 201)

### Quality gate E2 — Real file uploads

- [x] `requiresFileUpload` на User/Manager/Provider file-CTA (без seed stub id в UI-пути)
- [x] ActionBar: file picker → `/file-store/upload/pdf` → body field
- [x] Unit: report/shipment/contract attach без `staticBody` file stub

### Operator checklist E3 — Happy-path UI (`import + аванс + товар`)

| # | Роль | Действие в UI | Ожидаемый статус |
|---|------|---------------|------------------|
| 1 | User | `/forms/new` wizard → отправить | `organization_waiting_verification` (первая орг) |
| 2 | ICO | start → org approve → form accept | `form_waiting_verification` |
| 3 | ECO | start → accept | `form_accepted` |
| 4 | Manager | order generate/attach (PDF) → signing | `signing_order` |
| 5 | User | upload поручение (PDF) | `signing_order_waiting_verification` |
| 6 | Manager | order start → accept → assign Provider (seed default) → payment received → payment start | `payment_processing` |
| 7 | Provider | attach proof (PDF) → payment sent | `payment_sent` |
| 8 | Manager | report signing | `report_waiting` |
| 9 | User | upload report (PDF) | `report_waiting_verification` |
| 10 | Manager | report start → accept | `shipment_waiting` |
| 11 | User | upload shipment (PDF) | `shipment_waiting_verification` |
| 12 | Manager | shipment start → accept / completed | `COMPLETED` |

- [x] Чеклист зафиксирован; после COMPLETED mutate CTA пусты (unit)
- [x] Provider assign default seed id `6a8dbd070000000000000001`
- [x] `direction=import` default в wizard

### Quality gate E4 — Branches UI

- [x] Hints corrections / cancel / postpay (payment_received before report на постоплате)
- [x] Matrix CTA уже с P7; UI text reason + file upload
- [ ] Ручной: corrections / cancel / postpay → COMPLETED (оператор по чеклисту выше + NOTES StageHash)

### Quality gate E5 — Role cabinets

- [x] List/detail columns + reject comment + docs fields (User/Manager)
- [x] Provider PII note + узкий field set
- [x] Logout + role label в UI; README role picker

### Quality gate E6 — Docs + final DoD

- [x] `mgr_contract_attach`: file upload + number/date prompts (без seed file id)
- [x] User/Manager hints «PDF с диска» / advance-order
- [x] Seed Provider fixed ObjectId
- [ ] Финальный ручной DoD 5 пунктов (оператор после `start-local` + Nest + Vite)

## UI readiness follow-up (E7+)

### Quality gate E7 — Local file storage (MinIO)

- [x] MinIO + `minio-init` (bucket `fea360`) в `docker-compose.yml`
- [x] `S3_*` / `AWS_*` / `BUCKET_NAME` в `.env.example` + `start-local.sh` (endpoint `http://127.0.0.1:9000`)
- [x] S3 client: `forcePathStyle` + credentials when endpoint set
- [x] `node scripts/smoke-bdui-upload.js` — User login → `POST /file-store/upload/pdf` → preview PDF

### Quality gate E8 — Form field fidelity

- [x] Schema keys: `totals.amount` (money_minor), `currency.client`, `status` (не top-level `amount`/`currencyClient`)
- [x] Client: `formatFieldDisplay` + `refreshKey` на detail/list/status после CTA
- [x] Wizard: currency lowercase normalize before PATCH
- [x] Unit: User/Manager builders map DTO paths

### Quality gate E9 — Operator UX (navigation, sort, hints)

- [x] «К списку» на `forms.create` / `forms.detail` (`ScreenPage` breadcrumb → `/forms`)
- [x] DataTable: client-side sort (`defaultSort`, `sortableKeys`); staff queues по `updateDate` / status
- [x] Empty list: первый шаг (User — «Новая заявка»; staff — контекст очереди)
- [x] Hints: PDF 15 Мб / application/pdf (wizard + action_bar); поля сделки на create/detail
- [x] Unit: E9 hints + sort config в User/role builders

### Quality gate E10 — Seed directories

- [x] Seed: ≥2 active currencies, ≥2 orgs (legalAddress), ≥2 counterparties (country/bank geo), 2 HS codes
- [x] Wizard: `currenciesDataSource` + org select с адресом; без нового CRUD UI
- [x] Idempotent fixed ids (E10 range отдельно от `BDUI_SEED_*`)
- [x] `node scripts/smoke-bdui-seed-directories.js`; login 5 ролей не сломан (`smoke-bdui-login.js`)
- [x] Provider seed без ПДн клиента в counterparty (только бизнес-имена/реквизиты)

### Quality gate E11 — Inline directory create

- [x] Справочники: `POST /organization` (User site) + `POST /counterparty/create` — без нового CRUD UI
- [x] Wizard: `inlineCreates` на шагах deal/organization; `counterparty_select` + refresh options после create
- [x] Draft detail: `inline_directory` widget — create + PATCH `counterpartyRef` через `SAVE_FORM`
- [x] AuthZ: Provider `POST /organization` → 403/401 (не User site)
- [x] Unit: E11 inline actions + widgets в `user-screen.builders.spec.ts`
- [x] `node scripts/smoke-bdui-inline-directories.js`

### Quality gate E12 — SuperAdmin (root)

- [x] Seed `root@bdui.local` (`AccountRole.ROOT`, id `6a8dbd09…001`)
- [x] BDUI role `root`: `users.list/create/detail`, `directories.list/detail` (organizations), `forms.list/detail` admin
- [x] API: `POST/PATCH /admin/account`, `GET/PATCH /admin/manager/organization`, `GET /admin/form-payment`, `PUT …/cancel`
- [x] User schema без root CTA; User `GET /admin/account` → 403
- [x] Unit: `root-cabinet.builders.spec.ts`, E12 in `bdui-schema.service.spec.ts`
- [x] `node scripts/smoke-bdui-root.js`; login smoke includes root → `users.list`

### Quality gate E13 — Bulk actions

- [x] `DataTableWidget`: multi-select, bulk bar, лимит `BDUI_BULK_MAX_SELECTION` (20)
- [x] Root `users.list`: bulk block/unblock → sequential `PATCH /admin/account/{userId}` + eligibility `blocked`
- [x] Root `forms.list`: bulk cancel → sequential `PUT …/cancel` + exclude terminal statuses
- [x] Confirm dialog + partial success message; User list без bulk CTA
- [x] Unit: E13 в `root-cabinet.builders.spec.ts`, `bdui-schema.service.spec.ts`
- [x] `node scripts/smoke-bdui-bulk.js`

### Quality gate E14 — List management

- [x] Schema: status filter + columns id/status/amount/counterparty(org) на forms.list (User + staff)
- [x] Row-level CTA из matrix: User submit, ICO/ECO start, Manager order start, Provider payment start
- [x] Client: filter UI + inline row action (stopPropagation, refresh list, confirm)
- [x] Provider list без ПДн (нет organization.inn / client account)
- [x] Unit: `list-table.helpers.spec.ts`, E14 в user/role builders specs
- [x] `node scripts/smoke-bdui-list-management.js`

## E7–E14 summary

| Epic | Deliverable |
|------|-------------|
| E7 | MinIO upload + file id in Mongo |
| E8 | Amount/status DTO mapping + refresh after CTA |
| E9 | Breadcrumb, sort, empty states, hints |
| E10 | Seed directories + wizard selects |
| E11 | Inline org/counterparty create |
| E12 | Root SuperAdmin cabinet |
| E13 | Bulk block/cancel (root) |
| E14 | List filters + row actions |
