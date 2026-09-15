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

async function createDraftForm(
  userToken: string,
  packCurrency: string,
  packDate: string,
): Promise<string> {
  const created = (await authPost(userToken, "/api/v1/site/form-payment", {
    currency: packCurrency,
    invoice_amount: "1000",
    no_documents: true,
    contract_number: `REF-${Date.now()}`,
    contract_date: packDate,
  })) as { id: string };
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
 * Pilot Robot Matrix — Refund flow with funds held and cancel invariant.
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix
 */
test.describe("Pilot robot matrix refund flow @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("refund_happy_path full click ladder from draft to canceled @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(420_000);
    const { pack, packDir } = loadRobotPack();
    const orderPdf = readRobotPdf(packDir, pack.docs.order_pdf);

    // Prepare and purge
    const roles = await loginAllRoles();
    await purgeDemoMockCounterparties(roles.manager);
    const formId = await createDraftForm(roles.user, pack.currency, pack.packDate);

    // User: Submit form
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByRole("button", { name: /Отправить на проверку/ })).toBeVisible();
    await clickAction(page, /Отправить на проверку/);
    await page.waitForLoadState("networkidle");
    await expectFormStatus(page, AFTER_SUBMIT);

    // CO: Approve form
    await logout();
    await loginAs("eco");
    await page.goto("/cabinets/eco");
    await page.getByRole("link", { name: formId }).first().click();
    await clickAction(page, TAKE_IN_REVIEW);
    await confirmModal(page);
    await expectFormStatus(page, /form_verification/);
    
    // If org verification needed, approve it first
    const orgBtn = page.getByRole("button", { name: APPROVE_ORG });
    if (await orgBtn.isVisible({ timeout: 5_000 })) {
      await orgBtn.click();
      await confirmModal(page);
      await page.waitForLoadState("networkidle");
    }
    
    await clickAction(page, CONFIRM_FORM);
    await confirmModal(page);
    await expectFormStatus(page, /form_accepted/);

    // Manager: Order signing and user upload
    await logout();
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await clickAction(page, /Отправить поручение на подпись/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order$/);

    await logout();
    await loginAs("user");
    await page.goto(`/forms/${formId}`);
    await clickAction(page, /Загрузить подписанное поручение/);
    await attachModalFile(page, orderPdf, "order.pdf");
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_waiting_verification/);

    // Manager: Approve order
    await logout();
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await clickAction(page, /Взять поручение в проверку/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_verification/);
    await clickAction(page, /Подтвердить платёжное поручение/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_accepted/);

    // Manager: Mark payment received (funds held)
    await clickAction(page, /Подтвердить получение средств/);
    await confirmModal(page);
    await expectFormStatus(page, /payment_received/);

    // Verify cancel is blocked while funds held
    await expect(page.getByText(/Отмена заявки заблокирована/i)).toBeVisible({ timeout: 10_000 });

    // Manager: Initiate refund
    await clickAction(page, /Инициировать возврат средств/);
    await page.getByLabel(/Сумма возврата/).fill("1000");
    await page.getByLabel(/Валюта/).fill(pack.currency);
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_waiting/);

    // Manager: Start refund processing
    await clickAction(page, /Начать процесс возврата/);
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_processing/);

    // Manager: Confirm refund sent
    await clickAction(page, /Подтвердить возврат ДС/);
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_sent/);

    // Manager: Now cancel should be allowed
    await clickAction(page, /Отменить заявку/);
    await page.getByLabel(/Причина отмены/).fill("Refund completed, cancel test");
    await confirmModal(page);
    await expectFormStatus(page, /canceled_by_manager/);

    console.log(`✓ Refund happy path completed: ${formId}`);
  });

  test("refund_stop_and_cancel verify stop/cancel actions @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(420_000);
    const { pack, packDir } = loadRobotPack();
    const orderPdf = readRobotPdf(packDir, pack.docs.order_pdf);

    // Prepare and purge
    const roles = await loginAllRoles();
    await purgeDemoMockCounterparties(roles.manager);
    const formId = await createDraftForm(roles.user, pack.currency, pack.packDate);

    // User: Submit form
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Отправить на проверку/);
    await page.waitForLoadState("networkidle");
    await expectFormStatus(page, AFTER_SUBMIT);

    // CO: Approve form
    await logout();
    await loginAs("eco");
    await page.goto("/cabinets/eco");
    await page.getByRole("link", { name: formId }).first().click();
    await clickAction(page, TAKE_IN_REVIEW);
    await confirmModal(page);
    await expectFormStatus(page, /form_verification/);
    
    const orgBtn = page.getByRole("button", { name: APPROVE_ORG });
    if (await orgBtn.isVisible({ timeout: 5_000 })) {
      await orgBtn.click();
      await confirmModal(page);
      await page.waitForLoadState("networkidle");
    }
    
    await clickAction(page, CONFIRM_FORM);
    await confirmModal(page);
    await expectFormStatus(page, /form_accepted/);

    // Manager: Order signing and approval flow
    await logout();
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await clickAction(page, /Отправить поручение на подпись/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order$/);

    await logout();
    await loginAs("user");
    await page.goto(`/forms/${formId}`);
    await clickAction(page, /Загрузить подписанное поручение/);
    await attachModalFile(page, orderPdf, "order.pdf");
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_waiting_verification/);

    await logout();
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await clickAction(page, /Взять поручение в проверку/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_verification/);
    await clickAction(page, /Подтвердить платёжное поручение/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_accepted/);

    // Manager: Mark payment received
    await clickAction(page, /Подтвердить получение средств/);
    await confirmModal(page);
    await expectFormStatus(page, /payment_received/);

    // Manager: Initiate and start refund
    await clickAction(page, /Инициировать возврат средств/);
    await page.getByLabel(/Сумма возврата/).fill("1000");
    await page.getByLabel(/Валюта/).fill(pack.currency);
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_waiting/);

    await clickAction(page, /Начать процесс возврата/);
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_processing/);

    // Manager: Stop refund
    await clickAction(page, /Приостановить возврат/);
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_waiting/);

    // Manager: Cancel refund process
    await clickAction(page, /Отменить возврат/);
    await confirmModal(page);
    await expectFormStatus(page, /signing_order_accepted/);

    console.log(`✓ Refund stop/cancel completed: ${formId}`);
  });
});
