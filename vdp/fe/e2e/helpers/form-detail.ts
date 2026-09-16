import { type Page, expect } from "@playwright/test";

export type WaitForFormDetailOptions = {
  /** Overall budget including reload retries. Default 60s. */
  timeout?: number;
};

/**
 * Navigate to form card and wait until params panel is ready.
 * Avoids networkidle (flaky on Vite SPA / HMR / polling). Reloads on miss.
 * Fails fast with a clear message if unavailable or bounced to login.
 */
export async function waitForFormDetail(
  page: Page,
  formId: string,
  options?: WaitForFormDetailOptions,
): Promise<void> {
  const timeout = options?.timeout ?? 60_000;
  await expect(async () => {
    await page.goto(`/forms/${formId}`, { waitUntil: "domcontentloaded" });
    if (/\/login/.test(page.url())) {
      throw new Error(`form detail redirected to login for ${formId}`);
    }
    const unavailable = page.getByTestId("form-detail-unavailable");
    if (await unavailable.isVisible().catch(() => false)) {
      throw new Error(`form ${formId} unavailable for current role`);
    }
    const loading = page.getByTestId("form-detail-loading");
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15_000 });
    }
    await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout });
}
