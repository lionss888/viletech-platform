import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createCompletedForm, loginAllRoles } from "./helpers/api";

test.describe("Completed journey (app UI)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager sees completed status after full API journey", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createCompletedForm(tokens, `done-${Date.now()}`);

    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await expect(page.locator('[title="Сделка закрыта"], [title="Заявка закрыта"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
