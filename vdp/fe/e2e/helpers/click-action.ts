import { expect, type Page } from "@playwright/test";

/** Fail-fast: missing CTA must not burn the full test.setTimeout (7–17 min). */
const CTA_VISIBLE_MS = 10_000;
const CTA_ENABLED_MS = 30_000;
const MODAL_CONFIRM_MS = 20_000;
const MODAL_HIDDEN_MS = 30_000;

/**
 * Click a role=button by name. Visibility is fail-fast so stale labels surface in seconds.
 */
export async function clickAction(page: Page, name: string | RegExp): Promise<void> {
  const btn = page.getByRole("button", { name });
  await expect(btn, `CTA must be visible: ${String(name)}`).toBeVisible({
    timeout: CTA_VISIBLE_MS,
  });
  await expect(btn).toBeEnabled({ timeout: CTA_ENABLED_MS });
  await btn.click();
}

/** Confirm the primary modal button and wait until it closes. */
export async function confirmModal(page: Page): Promise<void> {
  const confirm = page.getByRole("button", { name: /^Подтвердить$/ });
  await expect(confirm, "modal Confirm must be enabled").toBeEnabled({
    timeout: MODAL_CONFIRM_MS,
  });
  await confirm.click();
  await expect(confirm).toBeHidden({ timeout: MODAL_HIDDEN_MS });
}
