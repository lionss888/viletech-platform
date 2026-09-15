import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  authPost,
  loginAllRoles,
  purgeDemoMockCounterparties,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";
import { loadRobotPack, readRobotPdf } from "./helpers/robot-fixtures";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const CONFIRM_FORM = /Подтвердить заявку/;
const AFTER_SUBMIT = /^(organization_waiting_verification|form_waiting_verification)$/;
const APPROVE_ORG = /Одобрить организацию и (передать во внешний комплаенс|продолжить)/;

async function createExportDraftForm(
  userToken: string,
  packCurrency: string,
  packDate: string,
): Promise<string> {
  const created = (await authPost(userToken, "/api/v1/site/form-payment", {
    direction: "export",
    currency: packCurrency,
    invoice_amount: "1000",
    no_documents: true,
    contract_number: `EXP-${Date.now()}`,
    contract_date: packDate,
  })) as { id: string };
  // For export, the wizard automatically sets payment_method to PAY_FROM_EXPORT when direction is export
  await authPost(userToken, `/api/v1/forms/${created.id}/actions/recognize_complete`, {});
  return created.id;
}

async function waitForFormDetail(page: Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

async function clickAction(page: Page, name: string | RegExp): Promise<void> {
  const btn = page.getByRole("button", { name });
  await expect(btn).toBeVisible({ timeout: 30_000 });
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await btn.click();
}

async function confirmModal(page: Page): Promise<void> {
  const confirm = page.getByRole("button", { name: /^Подтвердить$/ });
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  await confirm.click();
  // Wait until modal finishes (success closes it; failure leaves it open with error).
  await expect(confirm).toBeHidden({ timeout: 30_000 });
}

async function attachModalFile(page: Page, pdf: Buffer, fileName: string): Promise<void> {
  const input = page.getByTestId("action-modal-file");
  await expect(input).toBeAttached({ timeout: 15_000 });
  await input.setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: pdf });
}

/**
 * Pilot Robot Matrix — Export treasurer flow with PAY_FROM_EXPORT.
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix
 */
test.describe("Pilot robot matrix export treasurer flow @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("export_treasurer_happy_path full click ladder from draft @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(420_000);
    const { pack, packDir } = loadRobotPack();
    const orderPdf = readRobotPdf(packDir, pack.docs.order_pdf);
    const verificationPdf = readRobotPdf(packDir, pack.docs.report_pdf); // Reuse report PDF for verification

    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.root);

    // Create export form with PAY_FROM_EXPORT payment method
    const formId = await createExportDraftForm(
      tokens.user,
      pack.deal_fields.currency,
      pack.deal_fields.contract_date,
    );

    // 1. User submit
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Отправить на проверку$/);
    await expectFormStatus(page, AFTER_SUBMIT, { timeout: 30_000 });

    // 2–5. Manager continuity review → form_accepted
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);

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

    // 6. Manager initiates advance signing order (export-specific)
    await clickAction(page, /Сформировать (доп\. )?поручение/i);
    await expectFormStatus(page, "advance_signing_order", { timeout: 30_000 });

    // 7. User uploads signed order
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Загрузить (доп\. )?поручение/i);
    await attachModalFile(page, orderPdf, "advance-order.pdf");
    await confirmModal(page);
    await expectFormStatus(page, /^advance_signing_order_(waiting_verification|verification)$/, { timeout: 30_000 });

    // 8. Manager verifies and accepts advance order
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    let currentStatus = await page.getByTestId("status-badge").first().getAttribute("data-status");
    if (currentStatus === "advance_signing_order_waiting_verification") {
      await clickAction(page, /Взять (доп\. )?поручение в проверку/i);
      await expectFormStatus(page, "advance_signing_order_verification", { timeout: 30_000 });
    }
    await clickAction(page, /Подтвердить (доп\. )?поручение/i);
    await expectFormStatus(page, "advance_signing_order_accepted", { timeout: 30_000 });

    // 9. Manager confirms payment received from counterparty
    await clickAction(page, /Подтвердить получение средств/i);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });

    // 10. Assign execution provider, then start payment
    await clickAction(page, /^Назначить платёжного провайдера$/);
    const providerSelect = page.locator("label").filter({ hasText: /Провайдер исполнения/i }).locator("select");
    await expect(providerSelect).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => providerSelect.locator("option").count(), { timeout: 20_000 }).toBeGreaterThan(1);
    await providerSelect.selectOption({ index: 1 });
    await confirmModal(page);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });
    await clickAction(page, /Запустить исполнение платежа/i);
    await expectFormStatus(page, "payment_processing", { timeout: 30_000 });

    // 11. Treasurer confirms payment (export flow: payment_sent_treasurer)
    await logout();
    await loginAs("treasurer");
    await waitForFormDetail(page, formId);
    // Note: For export, treasurer_confirm transitions to payment_sent_treasurer instead of payment_processing
    await clickAction(page, /Подтвердить/i);
    await confirmModal(page);
    await expectFormStatus(page, "payment_sent_treasurer", { timeout: 30_000 });

    // 12. Treasurer creates signing order
    await clickAction(page, /Сформировать поручение казначея/i);
    await expectFormStatus(page, "signing_order_treasurer", { timeout: 30_000 });

    // 13. User uploads treasurer verification document
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Загрузить верификационный документ/i);
    await attachModalFile(page, verificationPdf, "verification.pdf");
    await confirmModal(page);
    await expectFormStatus(page, "signing_order_verification_treasurer", { timeout: 30_000 });

    // 14. Treasurer completes the transaction
    await logout();
    await loginAs("treasurer");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Завершить сделку/i);
    await confirmModal(page);
    await expectFormStatus(page, "completed", { timeout: 30_000 });

    // Verify final status
    await expect(page.getByTestId("status-badge")).toContainText(/Завершено|Закрыта/, { timeout: 10_000 });
  });
});
