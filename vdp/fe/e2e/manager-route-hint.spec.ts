import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createFormAccepted,
  createProviderProcessingForm,
  loginAllRoles,
} from "./helpers/api";
import { waitForFormDetail } from "./helpers/form-detail";

/**
 * Route-assembly hint stays on process roles (root), not on the form card.
 * Tag @pilot-matrix so make ci-pr-pilot runs this with the pilot ladder job.
 */
test.describe("Manager route hint @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager does not see manager-route-hint on form detail", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createFormAccepted(tokens, `route-hint-mgr-${Date.now()}`);
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("manager-route-hint")).toHaveCount(0);
  });

  test("root sees manager-route-hint on process roles", async ({ page, loginAs }) => {
    await loginAs("root");
    await page.goto("/process-roles");
    await expect(page.getByTestId("manager-route-hint")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("manager-route-hint")).toContainText(/Как собрать путь заявки/i);
  });

  test("user does not see manager-route-hint on form detail", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createFormAccepted(tokens, `route-hint-user-${Date.now()}`);
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("manager-route-hint")).toHaveCount(0);
  });

  test("provider does not see manager-route-hint on form detail", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createProviderProcessingForm(tokens, `route-hint-prov-${Date.now()}`);
    await loginAs("provider");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByText("Реквизиты платежа (без ПДн клиента)")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("manager-route-hint")).toHaveCount(0);
  });
});
