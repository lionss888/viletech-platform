import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createRejectedForm, createSubmittedForm, loginAllRoles } from "./helpers/api";

test.describe("Reject path (ECO → corrections → user resubmit)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("eco reject shows banner; user resubmits corrections", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createRejectedForm(tokens, `reject-${Date.now()}`);

    await loginAs("user");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByTitle("Возвращена на коррекцию")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("correction-guidance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Отправить исправления" })).toBeVisible();
    await page.getByRole("button", { name: "Отправить исправления" }).click();
    await expect(page.getByTitle("Ожидает проверки комплаенса")).toBeVisible({ timeout: 15_000 });
  });

  test("manager returns for corrections via UI with reason", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `ui-reject-${Date.now()}`);

    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    const take = page.getByRole("button", { name: /Взять .* в проверку|Взять заявку в проверку/i });
    if (await take.isVisible().catch(() => false)) {
      await take.click();
    }
    const rejectBtn = page.getByRole("button", { name: /Вернуть на доработку|Вернуть на коррекцию/i });
    await expect(rejectBtn).toBeVisible({ timeout: 15_000 });
    await rejectBtn.click();
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("E2E: исправьте документы");
    const markSelect = page.locator("label").filter({ hasText: /Отметка/ }).locator("select");
    if (await markSelect.isVisible().catch(() => false)) {
      await markSelect.selectOption({ index: 1 });
    }
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expect(page.getByTitle("Возвращена на коррекцию")).toBeVisible({ timeout: 15_000 });
  });
});
