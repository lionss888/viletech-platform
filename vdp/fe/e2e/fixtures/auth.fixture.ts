import { test as base, expect, type Page } from "@playwright/test";

import { APP_SEED_ACCOUNTS, type AppSeedAccount } from "../../src/lib/ved/app-seed-accounts";
import type { VedRole } from "../../src/lib/ved/types";

export type SeedRole = Exclude<VedRole, "bank">;

const SEED_BY_ROLE = Object.fromEntries(
  APP_SEED_ACCOUNTS.map((a) => [a.role, a]),
) as Record<SeedRole, AppSeedAccount>;

const AUTH_STORAGE_KEY = "vdp-auth-v1";

/**
 * Log in using compose seed credentials: open /login, persist JWT via the fe API proxy,
 * then open the dashboard (avoids SSR form submit before React hydration).
 */
export async function loginAs(page: Page, role: SeedRole): Promise<void> {
  const seed = SEED_BY_ROLE[role];
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    async ({ email, password, storageKey }) => {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error(`login failed: ${res.status}`);
      }
      const tokens = await res.json();
      sessionStorage.setItem(storageKey, JSON.stringify(tokens));
    },
    { email: seed.email, password: seed.password, storageKey: AUTH_STORAGE_KEY },
  );
  await page.goto("/dashboard");
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
