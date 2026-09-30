import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";
import { fillInvoiceAndReachParties, finishTermsAndReview } from "./helpers/wizard";

/**
 * Wizard counterparty optional fields (§2): registration number + legal address.
 * Tag: @pilot-matrix. Command: make playwright-pilot-matrix / make ci-pr-pilot
 */
test.describe("Form Wizard counterparty fields @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("fills counterparty step with new optional fields @pilot-matrix", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const cpName = `Wave3 CP ${stamp}`;
    const regNumber = `REG-${stamp}`;
    const legalAddress = `123 Main St, Moscow ${stamp}`;

    await loginAs("user");
    await page.goto("/forms/new");
    await expect(page.getByTestId("wizard-docs-step")).toBeVisible({ timeout: 30_000 });
    await fillInvoiceAndReachParties(page, "advance", `w3-cp-${stamp}.pdf`);
    await expect(page.getByTestId("wizard-parties-step")).toBeVisible();

    await page.getByTestId("wizard-create-cp-btn").click();
    const createLink = page.getByTestId("cp-pick-create");
    if (await createLink.isVisible()) {
      await createLink.click();
    }
    await expect(page.getByTestId("cp-create-form")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("counterparty-name-input").fill(cpName);
    await page.getByTestId("counterparty-country-input").fill("Китай");
    await page.getByTestId("counterparty-registration-number-input").fill(regNumber);
    await page.getByTestId("counterparty-legal-address-input").fill(legalAddress);

    await page.getByRole("button", { name: "Создать и выбрать" }).click();
    await expect(page.getByTestId("cp-create-form")).toHaveCount(0, { timeout: 30_000 });

    const cpSelect = page
      .getByTestId("wizard-parties-step")
      .locator("label")
      .filter({ hasText: /Контрагент/i })
      .locator("select");
    await expect(cpSelect).toContainText(cpName, { timeout: 20_000 });

    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-terms-step")).toBeVisible({ timeout: 20_000 });
    await finishTermsAndReview(page, "2500");

    await expect(page.getByTestId("wizard-review-registration-number")).toHaveText(regNumber, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("wizard-review-legal-address")).toHaveText(legalAddress);
  });
});
