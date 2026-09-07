import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createDraftForm, loginAllRoles } from "./helpers/api";

test.describe("manager-hides-drafts (catalog manager_hides_drafts)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager registry does not expose client draft as primary actionable create flow", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const draftId = await createDraftForm(tokens, `hide-${Date.now()}`);

    await loginAs("manager");
    await page.goto("/forms");
    await expect(page.getByRole("heading", { name: /Реестр|Входящие/i })).toBeVisible();
    // Draft number / id should not be the manager's primary action queue item.
    const draftLink = page.getByRole("link", { name: new RegExp(draftId.slice(0, 8), "i") });
    await expect(draftLink).toHaveCount(0);
  });
});
