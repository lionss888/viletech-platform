# Тестирование

## Пирамида

Unit-тесты в core, hub и fe — быстрая проверка домена, authz, copy, action bridge.

Service и HTTP gate-тесты R1–R12 — маршруты и переходы статусов.

Compose E2E — один form id User to completed на живом стеке.

Playwright — узкий набор browser journey, не дублирует всю матрицу ролей.

## Frontend unit

```sh
cd vdp/fe
npm test
```

Post-Lovable (2026-08-31): vitest restored (~93 tests). Credential contract: app `*@vdp.local` vs demo `*@demo.vdp.local`.

Compose applies SQL via `make compose-db-migrate` on every `compose-up` (existing volumes do not re-run initdb mounts).
## Backend unit

```sh
cd vdp
make test
```

Эквивалент go test ./... в core и hub.

## Integration gate RD10

```sh
cd vdp
make integration-gate
```

Последовательность: npm test в fe, make test, make compose-e2e. Compose-e2e поднимает стек и прогоняет scripts/compose-e2e.sh: основной путь User to completed, spot RD7 provider, RD8 root admin, RD9 bank channel, refund 409 smoke, RH2 ICO org-pending, ECO reject resubmit, refund full cycle.

## Playwright RD11 и RH2

Предусловие: make compose-up.

Рекомендуемый путь через Docker.

```sh
cd vdp
make playwright-e2e
```

Локально при поддерживаемом Chromium.

```sh
cd vdp/fe
npm i
npx playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 CORE_URL=http://127.0.0.1:8080 npm run test:e2e
```

Спеки e2e/: happy-path, reject-path, provider-acl, bank-badge, completed-journey, manager-payment. Матрица покрытия: [e2e-coverage-matrix.md](e2e-coverage-matrix.md).

## Слои backend тестов RH1

Слой 1 unit memory. Команда make test без build tag integration. Быстрые HTTP gate smoke tests в core используют memory store намеренно.

Слой 2 postgres integration. Команда make test-integration с тегом integration и env DATABASE_URL_CORE, DATABASE_URL_HUB. Покрывает store, outbox, hub inbox idempotency. Skip с сообщением если postgres недоступен локально.

Слой 3 compose API E2E. Команда make compose-e2e поднимает docker stack STORE_DRIVER postgres и scripts/compose-e2e.sh включая RH2 ICO reject refund sections.

Слой 4 browser E2E. make playwright-e2e отдельный failure domain.

Слой 5 release. make release-gate агрегирует все слои per RH4.

## Hub adapter tests RH3

```sh
cd vdp
make test-adapters
```

HTTP fake-server tests для docs и mail в CI job fast.

## Parity по программе RD

### RD1 create и submit

Шаг journey. Create to draft через auto recognize_complete после POST /forms.

UI CTA. recognize_complete автоматически, accept_form для submit.

Core API. POST forms, POST actions/recognize_complete, submit / form accept.

Gate. platform-create.test, integration-journey.test.

### RD2 ICO queue

Шаг journey. Очередь internal compliance, org verification.

UI CTA. ico_form_start, ico_form_accept.

Core API. ico/form/*.

Gate. integration-journey.test, compliance.test.

### RD3 ECO accept и reject

Шаг journey. Внешний compliance, corrections loop.

UI CTA. eco_form_start, eco_form_accept, eco reject path.

Core API. eco/form/*.

Gate. integration-journey.test, eco-flow.test.

### RD4 contract и order

Шаг journey. Agent, contract, signing order.

UI CTA. mgr_assign_agent, mgr_order_*, mgr_contract_*.

Core API. agent, contract, order.

Gate. manager-flow.test.

### RD5 payment и refund

Шаг journey. Provider assign, payment execution, refund branch.

UI CTA. mgr_payment_*, mgr_refund_*.

Core API. payment/*, refund/*.

Gate. manager-payment.test.

### RD6 close report и shipment

Шаг journey. Report signing, shipment, completed.

UI CTA. upload_report, mgr_completed.

Core API. report/*, shipment/*.

Gate. manager-close.test, compose-e2e.

### RD7 provider execution

Шаг journey. Provider payment без ПДн клиента.

UI CTA. prov_payment_start, prov_payment_sent, prov_attach_proof.

Core API. provider/payment/*.

Gate. provider-flow.test, compose-e2e RD7 spot.

### RD8 root cancel и admin

Шаг journey. Superadmin dashboard, /admin accounts.

UI CTA. root_cancel_form, /admin.

Core API. cancel_by_manager, GET /admin/account.

Gate. root-flow.test, compose-e2e RD8 spot.

### RD9 bank channel

Шаг journey. Bank API create, badge, settings.

UI CTA. /testing, ChannelBadge, BankSettingsPanel.

Core API. POST /api/v1/bank/forms.

Gate. bank-channel.test, compose-e2e RD9 spot.

### RD10 full gate

Шаг journey. Все роли на одном form id в compose-e2e.

Gate. make integration-gate.

## Parity по ключевым требованиям

Требование OCR create. CTA auto recognize_complete. Core recognize_complete. API POST actions/recognize_complete. Test platform-create.test, action-bridge.test.

Требование contract attach. CTA mgr_contract_attach. Core ManualAttachContract. API POST contract/attach. Test action-bridge.test.

Требование assign agent. CTA mgr_assign_agent. Core assign_agent. API POST agent. Test platform-store.

Требование refund. CTA mgr_refund_*. Core refund_*. API POST refund/*. Test refund bridge.

Требование bank channel. CTA testing page smoke. Core CreateOrGetBankForm. API POST /api/v1/bank/forms. Test compose smoke.

Требование ICO org block. CTA lockNote в UI. Core org approve block. Test compliance.test.

## Проверка формата документации

```sh
cd vdp
make docs-format-check
```

## CI

GitHub Actions workflow vdp-ci.yml. Job fast на каждом PR. Job integration и playwright на main nightly или PR с label integration. Release workflow vdp-release.yml на tag vdp-v* и workflow_dispatch. Подробнее [ci.md](../operations/ci.md).

Локальный эквивалент fast.

```sh
cd vdp/fe && npm test
cd vdp && make test && make test-adapters
```

Локальный эквивалент integration.

```sh
cd vdp && make integration-gate
```

Локальный pre-handover.

```sh
cd vdp && make release-gate
```
