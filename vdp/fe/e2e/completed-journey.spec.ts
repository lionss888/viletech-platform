import { expect, test } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles, seedForScenario } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

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
    await expectFormStatus(page, "completed", { timeout: 15_000 });
  });

  test("UAT F7: provider sees completed assigned form in registry and Закрыто @uat-f7", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(90_000);
    const tokens = await loginAllRoles();
    const stamp = Date.now();
    const formId = await seedForScenario("happy_path_to_completed", tokens, `f7-${stamp}`);

    await loginAs("provider");
    await page.goto("/forms");
    await expect(page.getByRole("heading", { name: "Реестр платёжных заявок" })).toBeVisible();
    await expect(page.getByText(/видимых заявок:\s*[1-9]/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Закрыто\s+[1-9]/ })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`ВЭД-${formId.slice(0, 8)}`, "i") })).toBeVisible();
  });
});
