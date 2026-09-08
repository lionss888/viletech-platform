import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles, seedForScenario } from "./helpers/api";

test.describe("ico-org (catalog ico_org_pending_approve)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("submitted form is visible for review queue (ICO or manager continuity)", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await seedForScenario("ico_org_pending_approve", tokens, `ico-${Date.now()}`);

    // Pilot (ICO off): manager owns org/form review. When ICO enabled, ICO still sees the form.
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await page.waitForLoadState("networkidle");
    const take = page.getByRole("button", { name: /Взять .* в проверку/i });
    const status = page.getByTitle(/Ожидает|проверк|Новая заявка/i);
    await expect(take.or(status).first()).toBeVisible({ timeout: 15_000 });
  });
});
