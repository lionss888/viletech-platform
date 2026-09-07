# Матрица E2E покрытия

Честная карта journey и статусов. Большинство переходов state machine покрыты unit и HTTP gate тестами, не browser E2E. После RH2 расширены compose-e2e и Playwright без combinatorial все роли × все статусы.

Единый каталог сценариев: пакет `vdp/core/internal/scenarioverify` (ids ниже). Compose shell, Playwright (tag `ui`) и Root `/testing` (API runner) ссылаются на те же id.

Не путать: длина каталога (фиксированные ~11 id) ≠ футер «сделок в системе» (число form_payments в БД).

## Легенда слоёв

Unit. Go или npm test без docker. API E2E. scripts/compose-e2e.sh на compose postgres stack. Root on-demand. POST `/api/v1/admin/scenario-runs` (system.admin). UI E2E. Playwright в vdp/fe/e2e. Not E2E. Только unit или HTTP gate; явный пробел browser.

## Touchpoints при смене CTA/статуса

Любой статусный UX меняет ≥3 слоя: `actions.ts` (labels) → `action-bridge` → core AuthZ/use-case → при необходимости `scenarioverify` executor → Playwright. Контракт continuity: `cta-continuity-contract.test.ts`. Process-roles ICO/ECO off → manager continuity path (runner fallback на `/forms/{id}/actions/*`).

## Каталог (scenarioverify)

ID happy_path_to_completed. API compose: main path. Root runner: mutating/dry_run (continuity manager if ICO/ECO off). UI Playwright: happy-path (partial) plus completed-journey.

ID eco_reject_resubmit. API compose: RH2 reject. Root runner: yes (manager eco_reject / manager_form_reject when ECO off). UI Playwright: reject-path (PR smoke).

ID ico_org_pending_approve. API compose: RH2 ICO spot. Root runner: yes (soft-pass if org already approved). UI Playwright: ico-org (spot).

ID manager_payment_assign_provider. API compose: main / RD7 prep. Root runner: yes. UI Playwright: manager-payment.

ID provider_payment_no_pii. API compose: RD7. Root runner: yes. UI Playwright: provider-acl (PR smoke).

ID bank_channel_badge. API compose: RD9. Root runner: yes. UI Playwright: bank-badge.

ID root_cancel. API compose: RD8. Root runner: yes. UI Playwright: not covered.

ID refund_smoke. API compose: refund smoke. Root runner: yes (OK when cancel returns 409). UI Playwright: not covered.

ID manager_hides_drafts. API compose: dash. Root runner: UI-only skip (honest). UI Playwright: manager-hides-drafts.

ID doc_preview_visible. API compose: dash. Root runner: UI-only skip (honest). UI Playwright: not covered (unit/helper).

ID health_core. API compose: health. Root runner: health mode. UI Playwright: dash.

## Критичные journeys

Journey User happy to completed. Unit integration-journey.test, manager-close.test, compose-e2e main, Root mutating. UI E2E completed-journey.spec.ts manager sees completed badge; happy-path partial to manager CTA. API path полный; browser partial.

Journey ECO reject to corrections resubmit. Unit eco-flow.test. API E2E RH2. Root runner. UI E2E reject-path.spec.ts (+ correction-guidance block).

Journey ICO org pending approve. Unit compliance.test. API E2E RH2. Root runner. UI E2E ico-org.spec.ts (spot / skip if approved).

Journey Manager payment received assign provider. Unit manager-payment.test. API + Root. UI E2E manager-payment.spec.ts.

Journey Provider payment without PII. Unit provider-flow.test. API RD7 + Root. UI E2E provider-acl.spec.ts.

Journey Refund full / cancel 409. Unit + compose + Root refund_smoke. UI E2E not covered.

Journey Root cancel admin. Unit root-flow.test. API RD8 + Root. UI E2E not covered.

Journey Bank channel badge. Unit bank-channel.test. API RD9 + Root. UI E2E bank-badge.spec.ts.

## Честность

Матрица не утверждает full role times status browser coverage. Root tool = API scenario runner + отчёт, не Chromium в кабинете. Mutating runs: local/alpha/demo/test; gamma/prod default dry_run. PR playwright smoke: login-form, user-submit, provider-acl, reject-path (не полный suite).

## Команды проверки

```sh
cd vdp && make integration-gate
cd vdp && make playwright-e2e
cd vdp/fe && npm test
# Root: login root@vdp.local → /testing → Запустить
# Local seed wipe: make core-seed-reset
```
