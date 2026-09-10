import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles, seedForScenario } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

test.describe("ico-org (catalog ico_org_pending_approve)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("unapproved org lands in waiting verification; manager can take review", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await seedForScenario("ico_org_pending_approve", tokens, `ico-${Date.now()}`);

    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await page.waitForLoadState("networkidle");
    await expectFormStatus(page, /organization_waiting_verification|organization_verification/, {
      timeout: 20_000,
    });
    const take = page.getByRole("button", { name: /Взять .* в проверку/i });
    await expect(take).toBeVisible({ timeout: 15_000 });

    // Restore approved org so later specs in the same worker are not stuck on org-pending.
    await fetch(
      `${(process.env.CORE_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "")}/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokens.ico}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
  });
});
