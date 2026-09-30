import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createFormAccepted, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";
import { waitForFormDetail } from "./helpers/form-detail";

/**
 * Advance §3.1: manager sets FX rate + commission before primary signing order.
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix / make ci-pr-pilot
 */
test.describe("Advance Rate Selection @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("Manager selects rate and commission before primary signing order @pilot-matrix", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(120_000);
    const tokens = await loginAllRoles();
    const formId = await createFormAccepted(tokens, `adv-rate-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, "form_accepted", { timeout: 30_000 });

    await expect(page.getByTestId("advance-rate-commission-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("rate-commission-panel")).toHaveCount(0);

    await page.getByTestId("advance-rate-input").fill("95.50");
    await page.getByTestId("advance-commission-mode-select").selectOption("fixed");
    await page.getByTestId("advance-commission-value-input").fill("1000");
    await page.getByTestId("set-advance-rate-button").click();

    await expect(page.getByTestId("advance-rate-commission-panel")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("form-rate-display")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("form-rate-display")).toContainText("95.50");
    await expectFormStatus(page, "form_accepted");
  });
});
