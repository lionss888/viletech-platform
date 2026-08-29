# VDP Frontend

UI для платформы VDP (`vdp/core`). Два контура:

- **App** (`/login`, `/dashboard`, `/forms`, …) — JWT + REST API через прокси `/api` → `vdp/core`.
- **Demo** (`/demo/*`) — локальные моки в браузере для UX-показа без бэкенда.

Оба контура используют одинаковые экраны и навигацию (`VedAppShell`); demo не является источником истины по статусам.

## Lovable UX parity

Интерфейс выровнен с экспортом Lovable (`VDP-28-08-26`):

- **Shell:** `h-screen`, dropdown «Создать», модалка поддержки, footer «сделок в системе: N»
- **Брендинг:** «ВЭД от Вилетех» в sidebar и landing
- **App create:** после `POST /forms` автоматически вызывается `recognize_complete` (OCR не подключён — клиент сразу попадает в `draft`)
- **Страницы:** компоненты в `src/components/ved/pages/*` (route-файлы только объявляют `Route`)

## Development

```sh
cd vdp/fe
npm i
npm run dev
```

С бэкендом: `cd vdp && make compose-up` → UI http://localhost:5173, API http://localhost:8080.

Seed app-аккаунты: `user@vdp.local` / `user` (и `manager`, `ico`, `eco`, `provider`, `bank`, `root` с паролем = local-part).

## Parity checklist (вводные → FE)

| RD | Journey step | UI CTA | Core / API | Gate |
|---|---|---|---|---|
| RD1 | create → draft | auto `recognize_complete` | POST …/actions/recognize_complete | platform-create.test |
| RD1 | submit | `accept_form` | submit / form/accept | integration-journey.test |
| RD2 | ICO queue | `ico_form_start`, `ico_form_accept` | ico/form/* | integration-journey + compliance.test |
| RD3 | ECO accept/reject | `eco_form_start`, `eco_form_accept` | eco/form/* | integration-journey + eco-flow.test |
| RD4 | contract + order | `mgr_assign_agent`, `mgr_order_*` | agent, contract, order | manager-flow.test |
| RD5 | payment + refund | `mgr_payment_*`, `mgr_refund_*` | payment/*, refund/* | manager-payment.test |
| RD6 | close (report→shipment) | `upload_report`, `mgr_completed` | report/*, shipment/* | manager-close.test + compose-e2e |
| RD7 | provider execution | `prov_payment_start`, `prov_payment_sent` | provider/payment/* | provider-flow.test + compose-e2e RD7 spot |
| RD8 | root cancel + admin | `root_cancel_form`, `/admin` | cancel_by_manager, GET /admin/account | root-flow.test + compose-e2e RD8 spot |
| RD9 | bank channel | `/testing`, `ChannelBadge` | POST /api/v1/bank/forms | bank-channel.test + compose-e2e RD9 spot |
| RD10 | full gate | all roles one journey | compose-e2e main `$ID` | `make integration-gate` |

| Требование | CTA | Core action | API | Test |
|---|---|---|---|---|
| OCR/create | auto `recognize_complete` после create (app) | recognize_complete | POST …/actions/recognize_complete | platform-create.test + action-bridge.test |
| Contract attach | `mgr_contract_attach` | ManualAttachContract | POST …/contract/attach | action-bridge.test |
| Assign agent | `mgr_assign_agent` | assign_agent | POST …/agent | platform-store |
| Refund | `mgr_refund_*` | refund_* | POST …/refund/* | refund.ts + bridge |
| Bank channel | testing page | CreateOrGetBankForm | POST /api/v1/bank/forms | compose smoke |
| ICO org block | lockNote | — | org approve/block | compliance.test |

### RD10 integration gate

```sh
cd vdp && make integration-gate
```

Runs `npm test` (fe), `go test ./...` (core+hub), then `compose-e2e` (User→completed on one form id + RD7/8/9 spot checks).

### RD11 Playwright E2E

Prerequisite: stack up (`make compose-up`). Seed logins via `/login` (`user@vdp.local` / `user`, …).

**Recommended (Docker, browsers preinstalled on Linux):**

```sh
cd vdp && make playwright-e2e
# same as: ./scripts/compose-playwright.sh
```

**Local host (Linux / supported macOS only):**

```sh
cd vdp/fe && npm i && npx playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 CORE_URL=http://127.0.0.1:8080 npm run test:e2e
```

On macOS versions where Playwright reports `does not support chromium on mac13`, use the Docker path above.

Specs (`e2e/`): happy path (user→eco→manager), reject/corrections, provider ACL (no «Клиент»/ПДн), bank badge via `/testing`.

Env: `PLAYWRIGHT_BASE_URL`, `CORE_URL`; Docker runner maps `host.docker.internal:5173` / `:8080` automatically.

**CI (GitHub Actions sketch):**

```yaml
- run: cd vdp && make compose-up
- run: cd vdp && make playwright-e2e
```

Smoke (compose): `make compose-up` затем `vdp/scripts/compose-fe-smoke.sh`.

Demo-аккаунты (только `/demo/login`): `user@demo.vdp.local` / `DemoUser2024!` и аналоги по ролям.
