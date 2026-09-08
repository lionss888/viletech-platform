import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles, seedForScenario } from "./helpers/api";

test.describe("completed-journey (catalog happy_path_to_completed)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager sees completed status on API-seeded form", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await seedForScenario("happy_path_to_completed", tokens, `done-${Date.now()}`);

    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByTestId("status-badge").and(page.locator('[data-status="completed"]')),
    ).toBeVisible({ timeout: 15_000 });
  });
});
