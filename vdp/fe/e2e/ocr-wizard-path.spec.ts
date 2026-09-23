import { test, expect, type Page } from "./fixtures/auth.fixture";
import type { FileChooser } from "@playwright/test";
import { assertCoreHealthy } from "./helpers/api";

/** Poll timeout in FE is 120s; allow small headroom for create + first paint. */
const OCR_TERMINAL_TIMEOUT_MS = 135_000;

/**
 * Upload invoice via visible zone + filechooser (gesture contract).
 */
async function uploadInvoiceViaGesture(page: Page): Promise<void> {
  await expect(page.getByTestId("wizard-docs-step")).toBeVisible();
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("wizard-invoice-file-zone").click();
  const chooser: FileChooser = await fileChooserPromise;
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\nInvoice INV-OCR-PATH 1500.00 USD\n",
  );
  await chooser.setFiles({
    name: "ocr-path-invoice.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(page.getByTestId("wizard-invoice-file-zone")).toContainText("ocr-path-invoice.pdf");
}

test.describe("OCR wizard product path", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("after invoice upload, OCR banner leaves pending (done or honest fail)", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(OCR_TERMINAL_TIMEOUT_MS + 30_000);
    await loginAs("user");
    await page.goto("/forms/new");
    await uploadInvoiceViaGesture(page);
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-direction-step")).toBeVisible({ timeout: 30_000 });
    const banner = page.getByTestId("wizard-ocr-progress");
    await expect(banner, "OCR banner must appear after docs step").toBeVisible({
      timeout: 15_000,
    });
    const terminal = page
      .getByTestId("wizard-ocr-progress-done")
      .or(page.getByTestId("wizard-ocr-progress-failed"))
      .or(page.getByTestId("wizard-ocr-progress-unavailable"))
      .or(page.getByTestId("wizard-ocr-progress-degraded"))
      .or(page.getByTestId("wizard-ocr-progress-auth_lost"));
    await expect(
      terminal,
      "OCR must leave pending: done, failed, unavailable, degraded, or auth_lost",
    ).toBeVisible({ timeout: OCR_TERMINAL_TIMEOUT_MS });
    await expect(page.getByTestId("wizard-ocr-pending")).toHaveCount(0);
  });
});
