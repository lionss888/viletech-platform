import { type Page, expect } from "@playwright/test";

/**
 * Assert the form StatusBadge shows a canonical domain status code.
 * Prefer this over Russian title strings (process-roles change badge copy).
 * Polls until data-status matches (badge is visible across transitions).
 */
export async function expectFormStatus(
  page: Page,
  status: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 20_000;
  const badge = page.getByTestId("status-badge").first();
  await expect(badge).toBeVisible({ timeout });
  if (typeof status === "string") {
    await expect(badge).toHaveAttribute("data-status", status, { timeout });
    return;
  }
  await expect
    .poll(async () => (await badge.getAttribute("data-status")) ?? "", { timeout })
    .toMatch(status);
}
