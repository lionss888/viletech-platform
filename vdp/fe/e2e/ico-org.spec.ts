import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles, seedForScenario } from "./helpers/api";

test.describe("ico-org (catalog ico_org_pending_approve)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("ICO sees form after user submit when org pending or ECO queue otherwise", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await seedForScenario("ico_org_pending_approve", tokens, `ico-${Date.now()}`);

    await loginAs("internal_compliance_officer");
    await page.goto(`/forms/${formId}`);
    const take = page.getByRole("button", { name: "Взять в проверку" });
    const approve = page.getByRole("button", { name: /Одобрить/i });
    const status = page.getByTitle(/Ожидает|проверк/i);
    await expect(take.or(approve).or(status)).toBeVisible({ timeout: 15_000 });
  });
});
