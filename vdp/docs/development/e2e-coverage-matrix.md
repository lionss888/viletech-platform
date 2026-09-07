# Матрица E2E покрытия

Честная карта journey и статусов. Большинство переходов state machine покрыты unit и HTTP gate тестами, не browser E2E. После RH2 расширены compose-e2e и Playwright без combinatorial все роли × все статусы.

Единый каталог сценариев: пакет `vdp/core/internal/scenarioverify` (ids ниже). Compose shell, Playwright (tag `ui`) и Root `/testing` (API runner) ссылаются на те же id.

## Легенда слоёв

Unit. Go или npm test без docker. API E2E. scripts/compose-e2e.sh на compose postgres stack. Root on-demand. POST `/api/v1/admin/scenario-runs` (system.admin). UI E2E. Playwright в vdp/fe/e2e. Not E2E. Только unit или HTTP gate; явный пробел browser.

## Каталог (scenarioverify)

| ID | API compose | Root runner | UI Playwright |
|----|-------------|-------------|---------------|
| happy_path_to_completed | main path | mutating/dry_run | happy-path (partial) + completed-journey |
| eco_reject_resubmit | RH2 reject | yes | reject-path |
| ico_org_pending_approve | RH2 ICO spot | yes (skip if org approved) | ico-org (spot) |
| manager_payment_assign_provider | main / RD7 prep | yes | manager-payment |
| provider_payment_no_pii | RD7 | yes | provider-acl |
| bank_channel_badge | RD9 | yes | bank-badge |
| root_cancel | RD8 | yes | not covered |
| refund_smoke | refund smoke | yes | not covered |
| manager_hides_drafts | — | dry/UI note | manager-hides-drafts |
| doc_preview_visible | — | dry/UI note | not covered (unit/helper) |
| health_core | health | health mode | — |

## Критичные journeys

Journey User happy to completed. Unit integration-journey.test, manager-close.test, compose-e2e main, Root mutating. UI E2E completed-journey.spec.ts manager sees completed badge; happy-path partial to manager CTA. API path полный; browser partial.

Journey ECO reject to corrections resubmit. Unit eco-flow.test. API E2E RH2. Root runner. UI E2E reject-path.spec.ts.

Journey ICO org pending approve. Unit compliance.test. API E2E RH2. Root runner. UI E2E ico-org.spec.ts (spot / skip if approved).

Journey Manager payment received assign provider. Unit manager-payment.test. API + Root. UI E2E manager-payment.spec.ts.

Journey Provider payment without PII. Unit provider-flow.test. API RD7 + Root. UI E2E provider-acl.spec.ts.

Journey Refund full / cancel 409. Unit + compose + Root refund_smoke. UI E2E not covered.

Journey Root cancel admin. Unit root-flow.test. API RD8 + Root. UI E2E not covered.

Journey Bank channel badge. Unit bank-channel.test. API RD9 + Root. UI E2E bank-badge.spec.ts.

## Честность

Матрица не утверждает full role times status browser coverage. Root tool = API scenario runner + отчёт, не Chromium в кабинете. Mutating runs: local/alpha/demo/test; gamma/prod default dry_run.

## Команды проверки

```sh
cd vdp && make integration-gate
cd vdp && make playwright-e2e
cd vdp/fe && npm test
# Root: login root@vdp.local → /testing → Запустить
```
