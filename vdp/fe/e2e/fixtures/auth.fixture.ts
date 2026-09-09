import { test as base, expect, type Page } from "@playwright/test";

import { APP_SEED_ACCOUNTS, type AppSeedAccount } from "../../src/lib/ved/app-seed-accounts";
import type { VedRole } from "../../src/lib/ved/types";

export type SeedRole = Exclude<VedRole, "bank">;

const SEED_BY_ROLE = Object.fromEntries(
  APP_SEED_ACCOUNTS.map((a) => [a.role, a]),
) as Record<SeedRole, AppSeedAccount>;

/** Wait until React has hydrated so form submit is handled by onSubmit, not native GET. */
async function waitForLoginReady(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Вход в платформу" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти" })).toBeEnabled();
  // SSR shell can paint before client handlers attach; brief settle avoids /login? native submit.
  await page.waitForTimeout(500);
}

/** Log in via /login using compose seed credentials. */
export async function loginAs(page: Page, role: SeedRole): Promise<void> {
  const seed = SEED_BY_ROLE[role];
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await waitForLoginReady(page);
      await page.getByLabel("E-mail").fill(seed.email);
      await page.getByLabel("Пароль").fill(seed.password);
      const loginResponse = page.waitForResponse(
        (res) => res.url().includes("/api/v1/auth/login") && res.request().method() === "POST",
        { timeout: 30_000 },
      );
      await page.getByRole("button", { name: "Войти" }).click();
      const res = await loginResponse;
      if (!res.ok()) {
        const error = page.locator("p.text-destructive, .text-destructive");
        const errText = (await error.first().textContent().catch(() => null))?.trim();
        throw new Error(`login http ${res.status()} for ${role}: ${errText ?? ""}`.trim());
      }
      await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
      await expect(page).toHaveURL(/\/dashboard/);
      return;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      await page.waitForTimeout(750 * attempt);
    }
  }
  throw lastErr ?? new Error(`login failed for ${role}`);
}

/** End app session and return to login screen. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login/);
}

type AuthFixtures = {
  loginAs: (role: SeedRole) => Promise<void>;
  logout: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  loginAs: async ({ page }, use) => {
    await use(async (role) => loginAs(page, role));
  },
  logout: async ({ page }, use) => {
    await use(async () => logout(page));
  },
});

export { expect };
