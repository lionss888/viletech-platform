import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createPaymentReceivedForm, loginAllRoles } from "./helpers/api";

test.describe("Manager payment (app UI)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager sees payment execution CTAs at payment_received", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createPaymentReceivedForm(tokens, `pay-${Date.now()}`);

    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByRole("button", { name: "Передать в исполнение" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("ДС получены").first()).toBeVisible();
  });
});
