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
  await waitForLoginReady(page);
  await page.getByLabel("E-mail").fill(seed.email);
  await page.getByLabel("Пароль").fill(seed.password);
  await page.getByRole("button", { name: "Войти" }).click();
  const error = page.locator("p.text-destructive, .text-destructive");
  await Promise.race([
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
    error.waitFor({ state: "visible", timeout: 20_000 }).then(async () => {
      throw new Error(`login failed: ${await error.textContent()}`);
    }),
  ]);
  await expect(page).toHaveURL(/\/dashboard/);
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
