import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createRejectedForm, loginAllRoles } from "./helpers/api";

test.describe("Reject path (ECO → corrections → user resubmit)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("eco reject shows banner; user resubmits corrections", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createRejectedForm(tokens, `reject-${Date.now()}`);

    await loginAs("user");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByRole("button", { name: "Отправить исправления" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[title="Возвращена на коррекцию"]').first()).toBeVisible();
    await page.getByRole("button", { name: "Отправить исправления" }).click();
    await expect(page.locator('[title="Ожидает проверки комплаенса"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
