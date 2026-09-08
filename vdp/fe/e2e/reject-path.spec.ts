import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createRejectedForm, createSubmittedForm, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const REJECT_FOR_CORRECTIONS = /Вернуть на доработку|Вернуть на коррекцию/i;
const AFTER_RESUBMIT = /^(organization_waiting_verification|form_waiting_verification)$/;

async function waitForFormDetail(page: Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

test.describe("Reject path (ECO → corrections → user resubmit)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("eco reject shows banner; user resubmits corrections", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createRejectedForm(tokens, `reject-${Date.now()}`);

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, "form_waiting_corrections", { timeout: 20_000 });
    await expect(page.getByTestId("correction-guidance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Отправить исправления" })).toBeVisible();
    await page.getByRole("button", { name: "Отправить исправления" }).click();
    await expectFormStatus(page, AFTER_RESUBMIT, { timeout: 20_000 });
  });

  test("manager returns for corrections via UI with reason", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `ui-reject-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    const take = page.getByRole("button", { name: TAKE_IN_REVIEW });
    if (await take.isVisible().catch(() => false)) {
      await take.click();
    }
    const rejectBtn = page.getByRole("button", { name: REJECT_FOR_CORRECTIONS });
    await expect(rejectBtn).toBeVisible({ timeout: 20_000 });
    await rejectBtn.click();
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("E2E: исправьте документы");
    const markSelect = page.locator("label").filter({ hasText: /Отметка/ }).locator("select");
    if (await markSelect.isVisible().catch(() => false)) {
      await markSelect.selectOption({ index: 1 });
    }
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expectFormStatus(page, "form_waiting_corrections", { timeout: 20_000 });
  });
});
