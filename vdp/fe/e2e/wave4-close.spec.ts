import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  authPut,
  createProviderProcessingForm,
  createSubmittedForm,
  loginAllRoles,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

async function waitForFormDetail(page: import("@playwright/test").Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

async function confirmModal(page: import("@playwright/test").Page): Promise<void> {
  const confirm = page.getByRole("button", { name: /^Подтвердить$/ });
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  await confirm.click();
  await expect(confirm).toBeHidden({ timeout: 30_000 });
}

test.describe("Wave4 report close / corrections text", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("P17: confirm report completes the deal", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createProviderProcessingForm(tokens, `w4-rep-${Date.now()}`);
    await authPut(tokens.provider, `/api/v1/provider/form-payment/${formId}/payment/sent`);
    await authPut(tokens.manager, `/api/v1/manager/form-payment/${formId}/report/signing`);
    await authPut(tokens.manager, `/api/v1/manager/form-payment/${formId}/report`);
    await authPut(tokens.manager, `/api/v1/manager/form-payment/${formId}/report/start`);
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, "report_verification", { timeout: 30_000 });
    const cta = page.getByRole("button", { name: /^Подтвердить отчет и завершить сделку$/ });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.click();
    await expectFormStatus(page, "completed", { timeout: 30_000 });
  });

  test("P19: manager reject has text only, no compliance mark catalog", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `w4-rej-${Date.now()}`);
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await page.getByRole("button", { name: /Взять (заявку|организацию) в проверку/i }).click();
    const rejectBtn = page.getByRole("button", { name: /Вернуть на доработку|Вернуть на коррекцию/i });
    await expect(rejectBtn).toBeVisible({ timeout: 20_000 });
    await rejectBtn.click();
    await expect(page.getByPlaceholder("Что именно нужно исправить или предоставить")).toBeVisible();
    await expect(page.locator("label").filter({ hasText: /Отметка/ })).toHaveCount(0);
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("Нужен актуальный инвойс");
    await confirmModal(page);
    await expectFormStatus(page, "form_waiting_corrections", { timeout: 30_000 });
  });
});
