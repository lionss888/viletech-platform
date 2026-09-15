import { expect, type Page } from "@playwright/test";

const REVIEW_TIMEOUT_MS = 15_000;

/**
 * Fill terms (amount, optional HS code, ship date) and wait for the review step.
 * Caller must already be on wizard-terms-step.
 */
export async function finishTermsAndReview(
  page: Page,
  amount: string = "1500",
): Promise<void> {
  await expect(page.getByTestId("wizard-terms-step")).toBeVisible();
  await page.getByTestId("wizard-amount").fill(amount);
  const hs = page.getByLabel(/Код ТН ВЭД/i);
  if (await hs.count()) {
    const count = await hs.locator("option").count();
    if (count > 1) {
      await hs.selectOption({ index: 1 });
    }
  }
  const ship = page.locator('input[type="date"]');
  if (await ship.count()) {
    await ship.first().fill("2026-10-01");
  }
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByTestId("wizard-review-step")).toBeVisible({
    timeout: REVIEW_TIMEOUT_MS,
  });
}

/**
 * Click save-draft on review. Fail-fast if the CTA testid is missing.
 */
export async function saveWizardDraft(page: Page): Promise<void> {
  const saveDraft = page.getByTestId("wizard-save-draft");
  await expect(saveDraft, "wizard-save-draft must be visible on review").toBeVisible({
    timeout: REVIEW_TIMEOUT_MS,
  });
  await saveDraft.click();
}
