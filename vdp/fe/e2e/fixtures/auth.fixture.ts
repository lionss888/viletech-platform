import { test as base, expect, type Page } from "@playwright/test";

import { APP_SEED_ACCOUNTS, type AppSeedAccount } from "../../src/lib/ved/app-seed-accounts";
import type { VedRole } from "../../src/lib/ved/types";

export type SeedRole = Exclude<VedRole, "bank">;

const SEED_BY_ROLE = Object.fromEntries(
  APP_SEED_ACCOUNTS.map((a) => [a.role, a]),
) as Record<SeedRole, AppSeedAccount>;

/** Log in via /login using compose seed credentials. */
export async function loginAs(page: Page, role: SeedRole): Promise<void> {
  const seed = SEED_BY_ROLE[role];
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(seed.email);
  await page.getByLabel("Пароль").fill(seed.password);
  await page.getByRole("button", { name: "Войти" }).click();
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
