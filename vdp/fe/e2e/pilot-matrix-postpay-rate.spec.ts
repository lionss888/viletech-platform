import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";
import type { Page } from "@playwright/test";
import { readRobotPdf, loadRobotPack } from "./helpers/robot-fixtures";

async function waitForFormDetail(page: Page, formId: string) {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-card")).toBeVisible({ timeout: 30_000 });
}

async function clickAction(page: Page, name: string | RegExp) {
  const btn = page.getByRole("button", { name });
  await expect(btn).toBeVisible({ timeout: 30_000 });
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await btn.click();
}

async function confirmModal(page: Page): Promise<void> {
  const confirm = page.getByRole("button", { name: /^Подтвердить$/ });
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  await confirm.click();
  await expect(confirm).toBeHidden({ timeout: 30_000 });
}

async function attachModalFile(page: Page, pdf: Buffer, fileName: string): Promise<void> {
  const input = page.getByTestId("action-modal-file");
  await expect(input).toBeAttached({ timeout: 15_000 });
  await input.setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: pdf });
}

async function fillNoDocsAndReachParties(
  page: Page,
  condition: "advance" | "postPayment" = "advance",
): Promise<void> {
  await expect(page.getByTestId("wizard-docs-step")).toBeVisible();
  await page.getByTestId("wizard-no-documents").click();
  await page.getByLabel(/Номер контракта/i).fill(`POSTPAY-${Date.now()}`);
  await page.locator('input[type="date"]').first().fill("2026-09-10");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-direction-step")).toBeVisible();
  await page.getByTestId("wizard-payment-condition").selectOption(condition);
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-parties-step")).toBeVisible();
  await page.getByRole("button", { name: "Далее" }).click();
}

async function finishTermsAndReview(page: Page, amount: string): Promise<void> {
  await expect(page.getByTestId("wizard-terms-step")).toBeVisible();
  await page.getByTestId("wizard-amount").fill(amount);
  const hs = page.getByLabel(/Код ТН ВЭД/i);
  if (await hs.count()) {
    const count = await hs.locator("option").count();
    if (count > 1) await hs.selectOption({ index: 1 });
  }
  const ship = page.locator('input[type="date"]');
  if (await ship.count()) await ship.first().fill("2026-10-01");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-review-step")).toBeVisible({ timeout: 15_000 });
}

/**
 * Pilot Matrix — POSTPAY_RATE_ON_PP (§10.3 / IMP8).
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix
 */
test.describe("Pilot matrix POSTPAY_RATE_ON_PP @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("postpay_provider_first_rate_commission_advance_order_to_report @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(420_000);
    const { pack, packDir } = loadRobotPack();
    const contractPdf = readRobotPdf(packDir, pack.docs.contract_pdf);
    const orderPdf = readRobotPdf(packDir, pack.docs.order_pdf);
    const advanceOrderPdf = readRobotPdf(packDir, pack.docs.order_pdf); // reuse for advance

    // 1. User: create import post_payment via wizard (aligned with wave2-wizard pattern)
    await loginAs("user");
    await page.goto("/forms/new");
    await page.waitForLoadState("networkidle");
    await fillNoDocsAndReachParties(page, "postPayment");
    await finishTermsAndReview(page, "5000");
    await page.getByTestId("wizard-save-draft").click();
    await expect(page.getByTestId("form-card")).toBeVisible({ timeout: 30_000 });
    const url = page.url();
    const formId = url.split("/forms/")[1]?.split(/[?#]/)[0];
    expect(formId).toBeTruthy();

    // 2. User: recognize_complete + submit
    await clickAction(page, /^Завершить распознавание$/);
    await expectFormStatus(page, "draft", { timeout: 30_000 });
    await clickAction(page, /^Отправить на проверку$/);
    await expectFormStatus(page, "form_waiting_verification", { timeout: 30_000 });

    // 3. ECO: accept
    await logout();
    await loginAs("external_compliance_officer");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Взять в проверку$/);
    await expectFormStatus(page, "form_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить заявку$/);
    await expectFormStatus(page, "form_accepted", { timeout: 30_000 });

    // 4. Manager: assign agent + contract + order (primary without rate ok for RATE_ON_PP)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Назначить платёжного агента$/);
    const agentSelect = page.locator("label").filter({ hasText: /Агент/i }).locator("select");
    await expect(agentSelect).toBeVisible({ timeout: 10_000 });
    const agentCount = await agentSelect.locator("option").count();
    expect(agentCount).toBeGreaterThan(1);
    await agentSelect.selectOption({ index: 1 });
    await confirmModal(page);
    await expectFormStatus(page, "contract_waiting", { timeout: 30_000 });
    await page.getByRole("button", { name: /Прикрепить договор вручную/ }).click();
    await attachModalFile(page, contractPdf, pack.docs.contract_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "signing_order", { timeout: 30_000 });

    // 5. User: upload primary order
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Загрузить подписанное поручение$/);
    await attachModalFile(page, orderPdf, pack.docs.order_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "signing_order_waiting_verification", { timeout: 30_000 });

    // 6. Manager: accept order without rate (gate allows for RATE_ON_PP)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Взять поручение в проверку$/);
    await expectFormStatus(page, "signing_order_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить поручение$/);
    await expectFormStatus(page, "signing_order_accepted", { timeout: 30_000 });

    // 7. Manager: mgr_payment_received + assign provider + mgr_payment_start (no treasurer yet)
    await clickAction(page, /^Подтвердить получение средств$/);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });
    await clickAction(page, /^Назначить платёжного провайдера$/);
    const providerSelect = page.locator("label").filter({ hasText: /Провайдер исполнения/i }).locator("select");
    await expect(providerSelect).toBeVisible({ timeout: 10_000 });
    const provCount = await providerSelect.locator("option").count();
    expect(provCount).toBeGreaterThan(1);
    await providerSelect.selectOption({ index: 1 });
    await confirmModal(page);
    await expectFormStatus(page, "provider_assigned", { timeout: 30_000 });
    await clickAction(page, /^Начать исполнение платежа$/);
    await expectFormStatus(page, "payment_started", { timeout: 30_000 });

    // 8. Provider: provider_payment_sent
    await logout();
    await loginAs("provider");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Перевод выполнен$/);
    await expectFormStatus(page, "payment_sent", { timeout: 30_000 });

    // 9. Manager: accept payment without receipt (RATE_ON_PP receipt is optional)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Подтвердить платёж$/);
    await expectFormStatus(page, "payment_accepted", { timeout: 30_000 });

    // 10. Manager: send order for advance payment (rate/commission workflow)
    await clickAction(page, /^Перевести аванс$/);
    await expectFormStatus(page, "advance_order", { timeout: 30_000 });
    await page.getByRole("button", { name: /Прикрепить поручение вручную/ }).click();
    await attachModalFile(page, advanceOrderPdf, pack.docs.order_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "advance_order_waiting_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить авансовое поручение$/);
    await expectFormStatus(page, "advance_order_accepted", { timeout: 30_000 });

    // 11. Provider: advance payment sent (no funds actually moved in test, just status)
    await logout();
    await loginAs("provider");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Аванс переведён$/);
    await expectFormStatus(page, "advance_payment_sent", { timeout: 30_000 });

    // 12. Manager: report signing -> report accept
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Начать отчётность$/);
    await expectFormStatus(page, "report_signing", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить отчёт$/);
    await expectFormStatus(page, "report_accepted", { timeout: 30_000 });

    // 13. Manager: request final documents
    await clickAction(page, /^Передать документы$/);
    await expectFormStatus(page, "documents_transfer", { timeout: 30_000 });
    await clickAction(page, /^Документы переданы$/);
    await expectFormStatus(page, "completed", { timeout: 30_000 });
  });
});
