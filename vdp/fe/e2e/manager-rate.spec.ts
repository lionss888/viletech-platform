import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createRejectedForm,
  loginAllRoles,
} from "./helpers/api";

test.describe("manager_sets_deal_rate", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("rate field on correction guidance saves deal rate", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    // Seed reject with rate mark so CorrectionGuidancePanel shows «Сохранить курс».
    const formId = await createRejectedForm(tokens, `rate-${Date.now()}`, {
      mark: "Курс не согласован",
      reason: "согласуйте курс сделки",
    });

    await loginAs("user");
    await page.goto(`/forms/${formId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("correction-rate")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("correction-rate").getByPlaceholder("95.5").fill("92.5");
    await page.getByRole("button", { name: "Сохранить курс" }).click();
    await expect(page.getByText("Курс сохранён — можно отправлять исправления.")).toBeVisible({
      timeout: 15_000,
    });
  });
});
