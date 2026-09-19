import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  authPut,
  createProviderProcessingForm,
  loginAllRoles,
} from "./helpers/api";
import { waitForFormDetail } from "./helpers/form-detail";

/**
 * Return episode stage 1 UI smoke: verify provider return report panel renders.
 */
test.describe("Return Episode Stage 1 UI @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("provider sees return report panel", async ({ page, loginAs }) => {
    test.setTimeout(90_000);

    const tokens = await loginAllRoles();
    const formId = await createProviderProcessingForm(tokens, "return-ui-smoke");
    
    // Advance to payment_sent status. Nest-parity route is PUT, not POST.
    await authPut(tokens.provider, `/api/v1/provider/form-payment/${formId}/payment/sent`);

    // Provider views form
    await loginAs("provider");
    await waitForFormDetail(page, formId);

    await expect(page.getByRole("button", { name: "Сообщить о возврате" })).toBeVisible();
    await expect(page.getByTestId("return-report-amount")).toBeVisible();
  });
});
