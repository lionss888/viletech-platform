import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createPaymentReceivedForm,
  loginAllRoles,
  purgeDemoMockCounterparties,
} from "./helpers/api";
import { clickAction, confirmModal } from "./helpers/click-action";
import { expectFormStatus } from "./helpers/status";
import { waitForFormDetail } from "./helpers/form-detail";

/**
 * Pilot Robot Matrix — refund after funds received.
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix
 */
test.describe("Pilot robot matrix refund flow @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("refund_happy_path full click ladder from draft to canceled @pilot-matrix", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(240_000);
    const roles = await loginAllRoles();
    await purgeDemoMockCounterparties(roles.manager);
    const formId = await createPaymentReceivedForm(roles, `ref-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, /payment_received/);

    await clickAction(page, /Инициировать возврат средств/);
    await page.getByLabel(/Сумма возврата/).fill("750");
    await page.getByLabel(/Валюта/).fill("USD");
    await page.getByLabel(/Комментарий для клиента/).fill("Pilot refund");
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_waiting/);
    await expect(page.getByText(/Отмена заявки заблокирована/i)).toBeVisible({ timeout: 10_000 });

    await clickAction(page, /Начать процесс возврата/);
    await expectFormStatus(page, /payment_refund_processing/);

    await clickAction(page, /Подтвердить возврат ДС/);
    await expectFormStatus(page, /payment_refund_sent/);
  });

  test("refund_stop_and_cancel verify stop/cancel actions @pilot-matrix", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(240_000);
    const roles = await loginAllRoles();
    await purgeDemoMockCounterparties(roles.manager);
    const formId = await createPaymentReceivedForm(roles, `ref-stop-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, /payment_received/);

    await clickAction(page, /Инициировать возврат средств/);
    await page.getByLabel(/Сумма возврата/).fill("750");
    await page.getByLabel(/Валюта/).fill("USD");
    await page.getByLabel(/Комментарий для клиента/).fill("Pilot refund stop");
    await confirmModal(page);
    await expectFormStatus(page, /payment_refund_waiting/);

    await clickAction(page, /Начать процесс возврата/);
    await expectFormStatus(page, /payment_refund_processing/);

    await clickAction(page, /Приостановить возврат/);
    await expectFormStatus(page, /payment_refund_waiting/);

    await clickAction(page, /Отменить возврат/);
    await expectFormStatus(page, /signing_order_accepted/);
  });
});
