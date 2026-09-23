import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  authPut,
  createProviderProcessingForm,
  loginAllRoles,
  purgeDemoMockCounterparties,
} from "./helpers/api";
import { clickAction, confirmModal } from "./helpers/click-action";
import { expectFormStatus } from "./helpers/status";
import { waitForFormDetail } from "./helpers/form-detail";
import { loadRobotPack, readRobotPdf } from "./helpers/robot-fixtures";

async function attachModalFile(page: Page, pdf: Buffer, fileName: string): Promise<void> {
  const input = page.getByTestId("action-modal-file");
  await expect(input).toBeAttached({ timeout: 15_000 });
  await input.setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: pdf });
}

async function seedPaymentSent(tokens: Awaited<ReturnType<typeof loginAllRoles>>, suffix: string): Promise<string> {
  const formId = await createProviderProcessingForm(tokens, suffix);
  await authPut(tokens.provider, `/api/v1/provider/form-payment/${formId}/payment/sent`);
  return formId;
}

/**
 * Pilot Robot Matrix — optional shipment branch.
 * Happy path remains report accept → completed. Tag: @pilot-matrix.
 */
test.describe("Pilot robot matrix shipment branch @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("shipment optional: report accept completes without shipment @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(240_000);
    const { pack, packDir } = loadRobotPack();
    const reportPdf = readRobotPdf(packDir, pack.docs.report_pdf);
    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.manager);
    const formId = await seedPaymentSent(tokens, `ship-opt-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("shipment-panel")).toHaveCount(0);
    await clickAction(page, /Отправить отчёт агента на подпись/);
    await expectFormStatus(page, /report_waiting/);

    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Загрузить подписанный отчёт/);
    await attachModalFile(page, reportPdf, "report.pdf");
    await confirmModal(page);
    await expectFormStatus(page, /report_waiting_verification/);

    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Взять отчёт в проверку/);
    await expectFormStatus(page, /report_verification/);
    await clickAction(page, /Подтвердить отчет и завершить сделку/);
    await expectFormStatus(page, /completed/);
    await expect(page.getByTestId("shipment-panel")).toHaveCount(0);
  });

  test("shipment happy path: manager initiates then user uploads then manager closes @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(240_000);
    const { pack, packDir } = loadRobotPack();
    const shipmentPdf = readRobotPdf(packDir, pack.docs.shipment_pdf);
    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.manager);
    const formId = await seedPaymentSent(tokens, `ship-hp-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Перейти к документам отгрузки/);
    await expectFormStatus(page, /shipment_waiting/);
    await expect(page.getByTestId("shipment-panel")).toBeVisible();

    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Загрузить документы об отгрузке/);
    await attachModalFile(page, shipmentPdf, "shipment.pdf");
    await confirmModal(page);
    await expectFormStatus(page, /shipment_waiting_verification/);

    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Взять отгрузку в проверку/);
    await expectFormStatus(page, /shipment_verification/);
    await clickAction(page, /Закрыть заявку/);
    await expectFormStatus(page, /completed/);
  });

  test("shipment reject then user resubmits @pilot-matrix", async ({ page, loginAs, logout }) => {
    test.setTimeout(240_000);
    const { pack, packDir } = loadRobotPack();
    const shipmentPdf = readRobotPdf(packDir, pack.docs.shipment_pdf);
    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.manager);
    const formId = await seedPaymentSent(tokens, `ship-rej-${Date.now()}`);

    await authPut(tokens.manager, `/api/v1/manager/form-payment/${formId}/shipment/waiting`);
    await authPut(tokens.user, `/api/v1/site/form-payment/${formId}/shipment`);
    await authPut(tokens.manager, `/api/v1/manager/form-payment/${formId}/shipment/start`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("shipment-panel")).toBeVisible();
    await clickAction(page, /Вернуть документы/);
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("Документы неполные");
    await confirmModal(page);
    await expectFormStatus(page, /shipment_waiting_corrections/);

    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /Загрузить исправленные документы/);
    await attachModalFile(page, shipmentPdf, "shipment-corrected.pdf");
    await confirmModal(page);
    await expectFormStatus(page, /shipment_waiting_verification/);
  });
});
