import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createFormAccepted, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

test.describe("Manager payment gate (app UI)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager sees payment start locked until provider is assigned", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createFormAccepted(tokens, `pay-gate-${Date.now()}`);
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByRole("button", { name: "Назначить платёжного агента" })).toBeVisible({
      timeout: 15_000,
    });
    await expectFormStatus(page, "form_accepted");
  });
});
