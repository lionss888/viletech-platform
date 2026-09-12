import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createDraftForm,
  createOrganizationApi,
  createPaymentAgentApi,
  loginAllRoles,
  purgeDemoMockCounterparties,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";
import { loadRobotPack, readRobotPdf } from "./helpers/robot-fixtures";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const CONFIRM_FORM = /Подтвердить заявку/;
const AFTER_SUBMIT = /^(organization_waiting_verification|form_waiting_verification)$/;
const APPROVE_ORG = /Одобрить организацию и (передать во внешний комплаенс|продолжить)/;

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
  const input = page.locator('input[type="file"]');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: pdf });
}

/**
 * Pilot Robot Matrix — full UI ladder (no mid-payment API seed).
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix
 */
test.describe("Pilot robot matrix full UI ladder @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("happy_path_to_completed full click ladder from draft @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(420_000);
    const { pack, packDir } = loadRobotPack();
    const contractPdf = readRobotPdf(packDir, pack.docs.contract_pdf);
    const orderPdf = readRobotPdf(packDir, pack.docs.order_pdf);
    const reportPdf = readRobotPdf(packDir, pack.docs.report_pdf);

    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.root);
    const paymentAgent = await createPaymentAgentApi(tokens.manager, {
      name: `Robot PA ${pack.organization.name}`.slice(0, 80),
      inn: `77${Date.now().toString().slice(-8)}`,
    });

    // Own client org per run: an accepted agency contract on the shared seed org would let
    // assign-agent resolve straight to signing_order and skip the contract leg below.
    const clientOrg = await createOrganizationApi(tokens.user, {
      name: `Robot Org ${pack.organization.name} ${Date.now()}`.slice(0, 80),
      inn: `78${Date.now().toString().slice(-8)}`,
      legal_address: "г. Москва, робот-матрица",
      country: pack.organization.country,
    });

    const formId = await createDraftForm(tokens, `matrix-${Date.now()}`, {
      currency: pack.deal_fields.currency,
      invoice_amount: pack.deal_fields.invoice_amount,
      contract_number: `${pack.deal_fields.contract_number}-${Date.now()}`,
      contract_date: pack.deal_fields.contract_date,
      organization_id: clientOrg.id,
    });

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

    // 6. Assign payment agent → contract_waiting (awaits signed agency contract)
    await clickAction(page, /^Назначить платёжного агента$/);
    const agentSelect = page.locator("label").filter({ hasText: /Платёжный агент/i }).locator("select");
    await expect(agentSelect).toBeVisible({ timeout: 10_000 });
    const agentCount = await agentSelect.locator("option").count();
    expect(agentCount).toBeGreaterThan(1);
    const agentOption = agentSelect.locator("option").filter({ hasText: paymentAgent.name });
    if ((await agentOption.count()) > 0) {
      await agentSelect.selectOption({ label: await agentOption.first().innerText() });
    } else {
      await agentSelect.selectOption({ index: 1 });
    }
    await confirmModal(page);
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, /^(contract_waiting|form_accepted)$/, { timeout: 30_000 });

    // 7. Reach signing_order: user uploads agency contract, or manager manual attach
    const statusAfterAgent =
      (await page.getByTestId("status-badge").first().getAttribute("data-status")) ?? "";
    if (statusAfterAgent === "contract_waiting") {
      await logout();
      await loginAs("user");
      await waitForFormDetail(page, formId);
      await clickAction(page, /Загрузить агентский договор/i);
      await attachModalFile(page, contractPdf, "contract.pdf");
      await confirmModal(page);
      await expectFormStatus(page, "contract_verification", { timeout: 30_000 });

      await logout();
      await loginAs("manager");
      await waitForFormDetail(page, formId);
      await clickAction(page, /^Подтвердить договор и сформировать поручение$|^Подтвердить договор$/);
      await expectFormStatus(page, "signing_order", { timeout: 30_000 });
    } else {
      await clickAction(page, /Прикрепить договор/i);
      await attachModalFile(page, contractPdf, "contract.pdf");
      await confirmModal(page);
      await expectFormStatus(page, "signing_order", { timeout: 30_000 });
    }

    // 8. User upload signed order
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Загрузить подписанное поручение$/);
    await attachModalFile(page, orderPdf, "order-signed.pdf");
    await confirmModal(page);
    await expectFormStatus(page, "signing_order_waiting_verification", { timeout: 30_000 });

    // 9–11. Manager order review + funds
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Взять поручение в проверку$/);
    await expectFormStatus(page, "signing_order_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить поручение$/);
    await expectFormStatus(page, "signing_order_accepted", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить получение средств$/);
    await expectFormStatus(page, "payment_received", { timeout: 30_000 });

    // 12–13. Assign provider + start payment
    await clickAction(page, /^Назначить платёжного провайдера$/);
    const providerSelect = page.locator("label").filter({ hasText: /Провайдер исполнения/i }).locator("select");
    await expect(providerSelect).toBeVisible({ timeout: 10_000 });
    const provCount = await providerSelect.locator("option").count();
    expect(provCount).toBeGreaterThan(1);
    await providerSelect.selectOption({ index: 1 });
    await confirmModal(page);
    await expect(page.getByRole("button", { name: /^Запустить исполнение платежа$/ })).toBeEnabled({
      timeout: 30_000,
    });
    await clickAction(page, /^Запустить исполнение платежа$/);
    await expectFormStatus(page, /^(payment_processing|payment_received)$/, { timeout: 30_000 });

    // 14–15. Provider execute
    await logout();
    await loginAs("provider");
    await waitForFormDetail(page, formId);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\b\d{4}\s?\d{6}\b/); // crude passport-ish
    expect(bodyText).not.toMatch(/паспорт/i);
    const startPay = page.getByRole("button", { name: /^Начать исполнение$/ });
    if (await startPay.isVisible().catch(() => false)) {
      await startPay.click();
      await expectFormStatus(page, "payment_processing", { timeout: 30_000 });
    }
    await clickAction(page, /^Платёж отправлен$/);
    await expectFormStatus(page, "payment_sent", { timeout: 30_000 });

    // 16. Manager report signing
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Отправить отчёт агента на подпись$/);
    await expectFormStatus(page, "report_waiting", { timeout: 30_000 });

    // 17. User upload report
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Загрузить подписанный отчёт$/);
    await attachModalFile(page, reportPdf, "report-signed.pdf");
    await confirmModal(page);
    await expectFormStatus(page, "report_waiting_verification", { timeout: 30_000 });

    // 18–19. Manager report review → completed (no shipment ladder)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Взять отчёт в проверку$/);
    await expectFormStatus(page, "report_verification", { timeout: 30_000 });
    await clickAction(page, /^Подтвердить отчет и завершить сделку$/);
    await expectFormStatus(page, "completed", { timeout: 30_000 });
  });

  test("manager_reject_to_corrections + user_resubmit UI @pilot-matrix", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(180_000);
    const tokens = await loginAllRoles();
    const { pack } = loadRobotPack();
    const formId = await createDraftForm(tokens, `rej-${Date.now()}`, {
      currency: pack.deal_fields.currency,
      invoice_amount: pack.deal_fields.invoice_amount,
      contract_number: `REJ-${Date.now()}`,
      contract_date: pack.deal_fields.contract_date,
    });

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await clickAction(page, /^Отправить на проверку$/);
    await expectFormStatus(page, AFTER_SUBMIT, { timeout: 30_000 });

    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await clickAction(page, TAKE_IN_REVIEW);
    const rejectBtn = page.getByRole("button", { name: /Вернуть на доработку|Вернуть на коррекцию/i });
    await expect(rejectBtn).toBeVisible({ timeout: 20_000 });
    await rejectBtn.click();
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("Matrix: догрузите инвойс");
    await expect(page.locator("label").filter({ hasText: /Отметка/ })).toHaveCount(0);
    await confirmModal(page);
    await expectFormStatus(page, "form_waiting_corrections", { timeout: 30_000 });

    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByRole("button", { name: /Отправить исправления|Отправить на проверку/i })).toBeVisible({
      timeout: 20_000,
    });
    await clickAction(page, /Отправить исправления|Отправить на проверку/i);
    await expectFormStatus(page, AFTER_SUBMIT, { timeout: 30_000 });
  });
});
