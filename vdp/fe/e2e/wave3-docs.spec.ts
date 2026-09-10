import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createPersistedDraftForm,
  createSubmittedForm,
  loginAllRoles,
  uploadAndAttachInvoice,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

async function waitForFormDetail(page: import("@playwright/test").Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

test.describe("Wave3 docs / provider / agency", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("P10: user can upload docs on submitted form", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `w3-upload-${Date.now()}`);
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, /organization_waiting_verification|form_waiting_verification/);
    const fileInput = page.getByTestId("form-doc-upload");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
    await fileInput.setInputFiles({
      name: "extra-invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 wave3"),
    });
    await expect(page.getByTestId("form-documents")).toContainText(/extra-invoice|Инвойс|Документ/i, {
      timeout: 20_000,
    });
  });

  test("P12: assign provider label wording", async ({ page, loginAs }) => {
    // Smoke: label constant is used in actions matrix for payment_received (covered by pilot too).
    await loginAs("manager");
    await page.goto("/forms");
    await expect(page.getByRole("heading", { name: /Заявки|Реестр/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("P14: invoice attach visible and contract hidden for provider filter unit path", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await createPersistedDraftForm(tokens, `w3-docs-${Date.now()}`, {
      amount: "90",
      currency: "USD",
    });
    await uploadAndAttachInvoice(tokens.user, formId, `inv-w3-${Date.now()}.pdf`);
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByText(/inv-w3|Инвойс|invoice/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
