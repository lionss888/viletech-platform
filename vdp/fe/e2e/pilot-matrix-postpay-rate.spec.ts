import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";
import { finishTermsAndReview, saveWizardDraft } from "./helpers/wizard";
import { readRobotPdf, loadRobotPack } from "./helpers/robot-fixtures";
import type { Page } from "@playwright/test";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const CONFIRM_FORM = /Подтвердить заявку/;
const APPROVE_ORG = /Одобрить организацию и (передать во внешний комплаенс|продолжить)/;
const AFTER_SUBMIT = /organization_waiting_verification|form_waiting_verification/;

async function waitForFormDetail(page: Page, formId: string) {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 30_000 });
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

    // 1. User: create import post_payment via wizard (aligned with wave2-wizard pattern)
    await loginAs("user");
    await page.goto("/forms/new");
    await page.waitForLoadState("networkidle");
    await fillNoDocsAndReachParties(page, "postPayment");
    await finishTermsAndReview(page, "5000");
    await saveWizardDraft(page);
    await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 30_000 });
    const url = page.url();
    const formId = url.split("/forms/")[1]?.split(/[?#]/)[0];
    expect(formId).toBeTruthy();

    // 2. User: no-doc form auto-lands on draft; submit
    await expectFormStatus(page, "draft", { timeout: 30_000 });
    await clickAction(page, /^Отправить на проверку$/);
    await expectFormStatus(page, AFTER_SUBMIT, { timeout: 30_000 });

    // 3. Manager continuity review → form_accepted (same as full-ladder)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    for (let i = 0; i < 6; i += 1) {
      const status = await page.getByTestId("status-badge").first().getAttribute("data-status");
      if (status === "form_accepted") break;
      if (status === "organization_waiting_verification" || status === "form_waiting_verification") {
        await clickAction(page, TAKE_IN_REVIEW);
        await expect
          .poll(async () => (await page.getByTestId("status-badge").first().getAttribute("data-status")) ?? "", {
            timeout: 30_000,
          })
          .not.toBe(status!);
        continue;
      }
      if (status === "organization_verification") {
        const approve = page.getByRole("button", { name: APPROVE_ORG });
        if (await approve.isVisible().catch(() => false)) {
          await approve.click();
        } else {
          await clickAction(page, CONFIRM_FORM);
        }
        await expect
          .poll(async () => (await page.getByTestId("status-badge").first().getAttribute("data-status")) ?? "", {
            timeout: 30_000,
          })
          .not.toBe("organization_verification");
        continue;
      }
      if (status === "form_verification") {
        await clickAction(page, CONFIRM_FORM);
        await expectFormStatus(page, "form_accepted", { timeout: 30_000 });
        break;
      }
      throw new Error(`unexpected status in review ladder: ${status}`);
    }
    await expectFormStatus(page, "form_accepted", { timeout: 30_000 });

    // 4. Assign agent + reach signing_order
    await clickAction(page, /^Назначить платёжного агента$/);
    const agentSelect = page.locator("label").filter({ hasText: /Платёжный агент|Агент/i }).locator("select");
    await expect(agentSelect).toBeVisible({ timeout: 10_000 });
    expect(await agentSelect.locator("option").count()).toBeGreaterThan(1);
    await agentSelect.selectOption({ index: 1 });
    await confirmModal(page);
    await waitForFormDetail(page, formId!);
    await expectFormStatus(page, /^(contract_waiting|form_accepted|signing_order)$/, { timeout: 30_000 });
    const statusAfterAgent =
      (await page.getByTestId("status-badge").first().getAttribute("data-status")) ?? "";
    if (statusAfterAgent === "contract_waiting") {
      await logout();
      await loginAs("user");
      await waitForFormDetail(page, formId!);
      await clickAction(page, /Загрузить агентский договор/i);
      await attachModalFile(page, contractPdf, pack.docs.contract_pdf);
      await confirmModal(page);
      await expectFormStatus(page, "contract_verification", { timeout: 30_000 });
      await logout();
      await loginAs("manager");
      await waitForFormDetail(page, formId!);
      await clickAction(page, /^Подтвердить договор и сформировать поручение$|^Подтвердить договор$/);
      await expectFormStatus(page, "signing_order", { timeout: 30_000 });
    } else if (statusAfterAgent === "form_accepted") {
      await clickAction(page, /Прикрепить договор/i);
      await attachModalFile(page, contractPdf, pack.docs.contract_pdf);
      await confirmModal(page);
      await expectFormStatus(page, "signing_order", { timeout: 30_000 });
    }

    // 5–6. User order + manager accept
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Загрузить подписанное поручение$/);
    await attachModalFile(page, orderPdf, pack.docs.order_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "signing_order_waiting_verification", { timeout: 30_000 });
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Взять поручение в проверку$/);
    await expectFormStatus(page, "signing_order_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить поручение$/);
    await expectFormStatus(page, "signing_order_accepted", { timeout: 30_000 });

    // 7. RATE_ON_PP: funds + provider, then manager starts payment (not treasurer)
    await clickAction(page, /^Подтвердить получение средств$/);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });
    await clickAction(page, /^Назначить платёжного провайдера$/);
    const providerSelect = page.locator("label").filter({ hasText: /Провайдер исполнения/i }).locator("select");
    await expect(providerSelect).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => providerSelect.locator("option").count(), { timeout: 20_000 }).toBeGreaterThan(1);
    await providerSelect.selectOption({ index: 1 });
    await confirmModal(page);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });
    await expect(page.getByTestId("awaits-treasurer")).toHaveCount(0);
    await clickAction(page, /^Запустить исполнение платежа$/);
    await expectFormStatus(page, "payment_processing", { timeout: 30_000 });

    // 8. Provider send
    await logout();
    await loginAs("provider");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Платёж отправлен$/);
    await expectFormStatus(page, "payment_sent", { timeout: 30_000 });

    // 9. Manager: rate/commission then extra order (RATE_ON_PP)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await expect(page.getByTestId("rate-commission-panel")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("rate-value").fill("95.5");
    await page.getByTestId("save-rate-commission").click();
    await expect(page.getByTestId("rate-commission-ack")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("needs-rate-advance")).toHaveCount(0);
    await clickAction(page, /^Сформировать доп\. поручение$/);
    await expectFormStatus(page, "advance_signing_order", { timeout: 30_000 });

    // 10. User extra order + manager accept
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Загрузить доп\. поручение$/);
    await attachModalFile(page, orderPdf, pack.docs.order_pdf);
    await confirmModal(page);
    await expectFormStatus(page, "advance_signing_order_waiting_verification", { timeout: 30_000 });
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId!);
    await clickAction(page, /^Взять доп\. поручение в проверку$/);
    await clickAction(page, /^Подтвердить доп\. поручение$/);
    await expectFormStatus(page, "advance_signing_order_accepted", { timeout: 30_000 });
  });
});
