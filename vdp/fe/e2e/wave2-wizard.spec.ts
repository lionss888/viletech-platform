import { test, expect, type Page } from "./fixtures/auth.fixture";
import { assertCoreHealthy, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

async function fillNoDocsAndReachParties(
  page: Page,
  condition: "advance" | "postPayment" = "advance",
): Promise<void> {
  await expect(page.getByTestId("wizard-docs-step")).toBeVisible();
  await page.getByTestId("wizard-no-documents").click();
  await page.getByLabel(/Номер контракта/i).fill(`W2-${Date.now()}`);
  await page.locator('input[type="date"]').first().fill("2026-09-10");
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-direction-step")).toBeVisible();
  await page.getByTestId("wizard-payment-condition").selectOption(condition);
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-parties-step")).toBeVisible();
}

async function finishTermsAndReview(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-terms-step")).toBeVisible();
  await expect(page.getByTestId("wizard-client-currency")).toBeVisible();
  await expect(page.getByTestId("wizard-counterparty-currency")).toBeVisible();
  await expect(page.getByText("Валюта инвойса")).toHaveCount(0);
  await page.getByTestId("wizard-amount").fill("1500");
  const hs = page.getByLabel(/Код ТН ВЭД/i);
  if (await hs.count()) {
    const options = hs.locator("option");
    const count = await options.count();
    if (count > 1) {
      await hs.selectOption({ index: 1 });
    }
  }
  const ship = page.locator('input[type="date"]');
  if (await ship.count()) {
    await ship.first().fill("2026-10-01");
  }
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-review-step")).toBeVisible();
}

test.describe("Wave2 wizard / OCR / submit", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("docs first: invoice-only reaches review without contract", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await expect(page.getByTestId("wizard-steps")).toContainText("Документы");
    await expect(page.getByTestId("wizard-docs-step")).toBeVisible();

    const pdf = Buffer.from("%PDF-1.4 wave2-invoice");
    await page.getByTestId("wizard-invoice-file").setInputFiles({
      name: "invoice-only.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-direction-step")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-parties-step")).toBeVisible();
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-terms-step")).toBeVisible();
    await page.getByTestId("wizard-amount").fill("2200");
    const hs = page.getByLabel(/Код ТН ВЭД/i);
    if (await hs.count()) {
      const count = await hs.locator("option").count();
      if (count > 1) await hs.selectOption({ index: 1 });
    }
    const ship = page.locator('input[type="date"]');
    if (await ship.count()) await ship.first().fill("2026-10-15");
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-review-step")).toBeVisible();
    await expect(page.getByText("Только инвойс")).toBeVisible();
  });

  test("preview: save draft lands on draft status", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await fillNoDocsAndReachParties(page);
    await finishTermsAndReview(page);
    await page.getByTestId("wizard-save-draft").click();
    await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 30_000 });
    await expectFormStatus(page, /^(creating|draft)$/, { timeout: 20_000 });
  });

  test("preview: send to manager reaches waiting verification", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await fillNoDocsAndReachParties(page, "postPayment");
    await finishTermsAndReview(page);
    await page.getByTestId("wizard-send-manager").click();
    await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 30_000 });
    await expectFormStatus(page, /organization_waiting_verification|form_waiting_verification/, {
      timeout: 20_000,
    });
    await expect(page.getByText(/Постоплата/i).first()).toBeVisible();
  });

  test("payment condition persists after create via API path", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    expect(tokens.user).toBeTruthy();
    await loginAs("user");
    await page.goto("/forms/new");
    await fillNoDocsAndReachParties(page, "advance");
    await finishTermsAndReview(page);
    await page.getByTestId("wizard-save-draft").click();
    await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Аванс")).toBeVisible();
  });
});
