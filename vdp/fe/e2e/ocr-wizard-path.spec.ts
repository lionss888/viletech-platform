import { test, expect, type Page } from "./fixtures/auth.fixture";
import type { FileChooser } from "@playwright/test";
import { assertCoreHealthy } from "./helpers/api";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Poll timeout in FE is 165s; allow headroom for create + late degraded callback. */
const OCR_TERMINAL_TIMEOUT_MS = 195_000;

const FE_ROOT = path.dirname(fileURLToPath(import.meta.url));
/** Prefer compose-playwright mount; fall back to workspace path for host runs. */
const REAL_INVOICE =
  process.env.VDP_REAL_INVOICE?.trim() ||
  path.resolve(FE_ROOT, "../../../вводные/примеры документов/Инвойсы/Euroled Invoice-25918.pdf");

/**
 * Upload invoice via visible zone + filechooser (gesture contract).
 */
async function uploadInvoiceViaGesture(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer } | string,
): Promise<void> {
  await expect(page.getByTestId("wizard-docs-step")).toBeVisible();
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("wizard-invoice-file-zone").click();
  const chooser: FileChooser = await fileChooserPromise;
  if (typeof file === "string") {
    await chooser.setFiles(file);
  } else {
    await chooser.setFiles(file);
  }
  const expectedName = typeof file === "string" ? path.basename(file) : file.name;
  await expect(page.getByTestId("wizard-invoice-file-zone")).toContainText(expectedName);
}

test.describe("OCR wizard product path", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("docs step caption does not promise guaranteed autofill", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await expect(page.getByTestId("wizard-docs-step")).toBeVisible();
    const caption = page.getByTestId("wizard-step-caption");
    await expect(caption).toBeVisible();
    await expect(caption).not.toContainText(/подставятся автоматически/i);
    await expect(caption).toContainText(/если удастся/i);
  });

  test("after invoice upload, OCR banner leaves pending (done or honest fail)", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(OCR_TERMINAL_TIMEOUT_MS + 30_000);
    await loginAs("user");
    await page.goto("/forms/new");
    await uploadInvoiceViaGesture(page, {
      name: "ocr-path-invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\nInvoice INV-OCR-PATH Total 1500.00 USD\n",
      ),
    });
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
    const degraded = page.getByTestId("wizard-ocr-progress-degraded");
    if (await degraded.isVisible()) {
      await expect(degraded).not.toContainText(/подставятся сами/i);
      await page.getByTestId("wizard-extraction-dialog-trigger").click();
      // Modal portals content; wrapper testid stays aria-hidden — assert panel inside dialog.
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("extraction-review")).toBeVisible();
      await expect(page.getByTestId("extraction-meta")).toBeVisible();
      await expect(page.getByTestId("extraction-view-only-banner")).toBeVisible();
      await expect(page.getByRole("button", { name: /Подтвердить распознавание/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    const done = page.getByTestId("wizard-ocr-progress-done");
    if (await done.isVisible()) {
      await page.getByTestId("wizard-extraction-dialog-trigger").click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("extraction-review")).toBeVisible();
      await expect(page.getByTestId("extraction-view-only-banner")).toBeVisible();
      await expect(page.getByRole("button", { name: /Подтвердить распознавание/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Далее" }).click();
      await page.getByRole("button", { name: "Далее" }).click();
      await expect(page.getByTestId("wizard-terms-step")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("wizard-amount")).not.toHaveValue("");
    }
  });

  test("real invoice PDF: terminal banner is honest about limitations or prefills", async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(OCR_TERMINAL_TIMEOUT_MS + 60_000);
    await loginAs("user");
    await page.goto("/forms/new");
    await uploadInvoiceViaGesture(page, REAL_INVOICE);
    await expect(page.getByTestId("wizard-step-caption")).not.toContainText(/подставятся автоматически/i);
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-direction-step")).toBeVisible({ timeout: 30_000 });
    const terminal = page
      .getByTestId("wizard-ocr-progress-done")
      .or(page.getByTestId("wizard-ocr-progress-failed"))
      .or(page.getByTestId("wizard-ocr-progress-unavailable"))
      .or(page.getByTestId("wizard-ocr-progress-degraded"))
      .or(page.getByTestId("wizard-ocr-progress-auth_lost"));
    await expect(terminal).toBeVisible({ timeout: OCR_TERMINAL_TIMEOUT_MS });
    const bannerText = await page.getByTestId("wizard-ocr-progress").innerText();
    expect(bannerText).not.toMatch(/подставятся сами/i);
    if (await page.getByTestId("wizard-ocr-progress-done").isVisible()) {
      await page.getByRole("button", { name: "Далее" }).click();
      await page.getByRole("button", { name: "Далее" }).click();
      await expect(page.getByTestId("wizard-terms-step")).toBeVisible({ timeout: 15_000 });
      const amount = await page.getByTestId("wizard-amount").inputValue();
      expect(amount.trim().length).toBeGreaterThan(0);
    }
  });
});
