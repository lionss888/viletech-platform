import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createProviderProcessingForm, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

test.describe("provider_return_to_manager", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("provider returns payment to manager via CTA", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createProviderProcessingForm(tokens, `prov-ret-${Date.now()}`);

    await loginAs("provider");
    await page.goto(`/forms/${formId}`);
    await page.waitForLoadState("networkidle");
    const returnBtn = page.getByRole("button", { name: "Вернуть менеджеру" });
    await expect(returnBtn).toBeVisible({ timeout: 20_000 });
    await returnBtn.click();
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill(
      "E2E: вернуть менеджеру для уточнения",
    );
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expectFormStatus(page, "manager_checking", { timeout: 20_000 });
  });
});
