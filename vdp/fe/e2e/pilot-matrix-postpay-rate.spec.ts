import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";
import type { Page } from "@playwright/test";
import { readRobotPdf, loadRobotPack } from "./helpers/robot-fixtures";

async function waitForFormDetail(page: Page, formId: string) {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-card")).toBeVisible({ timeout: 30_000 });
}

async function expectFormStatus(page: Page, status: string, opts?: { timeout?: number }) {
  await expect(page.getByTestId("form-card-status")).toContainText(status, opts);
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

    // 1. User: create import post_payment
    await loginAs("user");
    await page.goto("/forms/new");
    await page.waitForLoadState("networkidle");
    const direction = page.locator("label").filter({ hasText: /Направление/i }).locator("select");
    await expect(direction).toBeVisible({ timeout: 10_000 });
    await direction.selectOption("import");
    const condition = page.locator("label").filter({ hasText: /Условие оплаты/i }).locator("select");
    await expect(condition).toBeVisible({ timeout: 10_000 });
    await condition.selectOption("postPayment");
    const goodName = page.locator("label").filter({ hasText: /Наименование товара/i }).locator("input");
    await expect(goodName).toBeVisible({ timeout: 10_000 });
    await goodName.fill("Import RATE_ON_PP goods");
    const amount = page.locator("label").filter({ hasText: /Сумма сделки/i }).locator("input");
    await expect(amount).toBeVisible({ timeout: 10_000 });
    await amount.fill("5000");
    await page.getByRole("button", { name: /Создать черновик/ }).click();
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
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Взять в проверку$/);
    await expectFormStatus(page, "form_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить заявку$/);
    await expectFormStatus(page, "form_accepted", { timeout: 30_000 });

    // 4. Manager: assign agent + contract + order (primary without rate ok for RATE_ON_PP)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
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
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Загрузить подписанное поручение$/);
    await attachModalFile(page, orderPdf, pack.docs.order_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "signing_order_waiting_verification", { timeout: 30_000 });

    // 6. Manager: accept order without rate (gate allows for RATE_ON_PP)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
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
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });
    // RATE_ON_PP: mgr payment_start available (no treasurer gate yet)
    await clickAction(page, /^Запустить исполнение платежа$/);
    await expectFormStatus(page, "payment_processing", { timeout: 30_000 });

    // 8. Provider: execute (provider-first before client RUB)
    await logout();
    await loginAs("provider");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, "payment_processing", { timeout: 15_000 });
    await clickAction(page, /^Платёж отправлен$/);
    await expectFormStatus(page, "payment_sent", { timeout: 30_000 });

    // 9. Manager: RateCommissionPanel (set rate + one reward_mode after payment_sent)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, "payment_sent", { timeout: 15_000 });
    const ratePanel = page.getByTestId("rate-commission-panel");
    await expect(ratePanel).toBeVisible({ timeout: 15_000 });
    const rateInput = ratePanel.locator("input").filter({ hasText: /Курс/i }).or(ratePanel.locator('input[placeholder*="95"]')).first();
    await rateInput.fill("92.5");
    const rewardSelect = ratePanel.locator("select").first();
    await rewardSelect.selectOption("percent");
    const percentInput = ratePanel.locator("input").filter({ hasText: /Процент/i }).or(ratePanel.locator('input[placeholder*="1.5"]')).first();
    await percentInput.fill("1.5");
    await page.getByTestId("save-rate-commission").click();
    await expect(page.getByTestId("rate-commission-ack")).toBeVisible({ timeout: 15_000 });

    // 10. Manager: mgr_advance_signing (form advance order after rate)
    await clickAction(page, /^Сформировать доп\. поручение$/);
    await expectFormStatus(page, "advance_signing_order", { timeout: 30_000 });

    // 11. User: upload advance order
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Загрузить доп\. поручение$/);
    await attachModalFile(page, advanceOrderPdf, "advance-order.pdf");
    await confirmModal(page);
    await expectFormStatus(page, "advance_signing_order_waiting_verification", { timeout: 30_000 });

    // 12. Manager: accept advance order
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Взять доп\. поручение в проверку$/);
    await expectFormStatus(page, "advance_signing_order_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить доп\. поручение$/);
    await expectFormStatus(page, "advance_signing_order_accepted", { timeout: 30_000 });

    // 13. Manager: mgr_payment_received for RUB after advance order
    await clickAction(page, /^Подтвердить получение средств$/);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });

    // 14. Treasurer: confirm RUB coverage for RATE_ON_PP → report_waiting (not payment_processing)
    await logout();
    await loginAs("treasurer");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Подтвердить покрытие$/);
    await confirmModal(page);
    await expectFormStatus(page, "report_waiting", { timeout: 30_000 });

    // 15. Manager: report signing + User upload report + Manager accept report → completed
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Отправить отчёт агента на подпись$/);
    await expectFormStatus(page, "report_waiting", { timeout: 30_000 });

    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    const reportPdf = readRobotPdf(packDir, pack.docs.report_pdf);
    await clickAction(page, /^Загрузить подписанный отчёт$/);
    await attachModalFile(page, reportPdf, pack.docs.report_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "report_waiting_verification", { timeout: 30_000 });

    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Взять отчёт в проверку$/);
    await expectFormStatus(page, "report_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить отчет и завершить сделку$/);
    await expectFormStatus(page, "completed", { timeout: 30_000 });

    console.log(`POSTPAY RATE_ON_PP journey completed for form ${formId}`);
  });
});
