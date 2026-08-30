# Матрица E2E покрытия

Честная карта journey и статусов. Большинство переходов state machine покрыты unit и HTTP gate тестами, не browser E2E. После RH2 расширены compose-e2e и Playwright без combinatorial все роли × все статусы.

## Легенда слоёв

Unit. Go или npm test без docker. API E2E. scripts/compose-e2e.sh на compose postgres stack. UI E2E. Playwright в vdp/fe/e2e. Not E2E. Только unit или HTTP gate; явный пробел browser и compose journey.

## Критичные journeys

Journey User happy to completed. Unit integration-journey.test, manager-close.test, compose-e2e main section. UI E2E completed-journey.spec.ts manager sees completed badge. API path полный; browser partial manager view only.

Journey ECO reject to corrections resubmit. Unit eco-flow.test, integration-journey.test. API E2E RH2 ECO reject section in compose-e2e.sh. UI E2E reject-path.spec.ts.

Journey ICO org pending approve. Unit compliance.test. API E2E RH2 ICO org-pending spot in compose-e2e.sh. UI E2E not covered; unit only for ICO queue nav.

Journey Manager payment received assign provider. Unit manager-payment.test. API E2E main path includes payment_received. UI E2E manager-payment.spec.ts CTAs Передать в исполнение.

Journey Provider payment without PII. Unit provider-flow.test. API E2E RD7 spot and main path. UI E2E provider-acl.spec.ts.

Journey Refund full to payment_refund_sent. Unit refund bridge tests. API E2E RH2 refund full section. UI E2E not covered.

Journey Refund cancel 409 smoke. Unit refund tests. API E2E existing smoke in compose-e2e.sh. UI E2E not covered.

Journey Root cancel admin. Unit root-flow.test. API E2E RD8 spot. UI E2E not covered.

Journey Bank channel badge. Unit bank-channel.test. API E2E RD9 spot. UI E2E bank-badge.spec.ts.

Journey Happy path partial UI create to assign agent. Unit platform-create.test. API E2E not duplicated. UI E2E happy-path.spec.ts.

## Статусы form payment

Draft and form_waiting_verification. Mostly unit and HTTP gates. Compose main path touches. Playwright happy-path partial.

organization_waiting_verification. Unit compliance.test. Compose RH2 ICO spot. Not Playwright.

form_waiting_corrections. Unit eco-flow.test. Compose RH2 reject section. Playwright reject-path.

payment_received payment_processing payment_sent. Unit manager-payment provider-flow. Compose main. Playwright manager-payment partial.

completed. Unit manager-close.test. Compose main. Playwright completed-journey manager badge.

payment_refund_sent and refund variants. Unit refund tests. Compose RH2 full refund API. Not Playwright.

advance_signing_order treasurer diadoc shipment corrections. Unit selective gates. Not compose E2E. Not Playwright. Documented as unit only honesty.

## Hub adapters

Docs generate HTTP contract. Unit docs_http_test.go in CI fast job. Not compose E2E with real file store.

Mail notify HTTP contract. Unit mail_http_test.go in CI fast job. Staging manual SMTP.

Diadoc TG 1C OCR real vendor. Staging manual only per staging-checklist.

## Команды проверки

```sh
cd vdp && make integration-gate
cd vdp && make playwright-e2e
cd vdp/fe && npm test
```

## Честность

Матрица не утверждает full role times status browser coverage. Pilot demo опирается на compose API E2E plus expanded Playwright six specs. Prod gaps remain in known-gaps.md.
