import { test, expect } from "@playwright/test";

test("user can login and open forms registry", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("E-mail").fill("user@vdp.local");
  await page.getByLabel("Пароль").fill("user");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: "Войти" }).click(),
  ]);
  await page.goto("/forms");
  await expect(page.getByRole("heading", { name: /Реестр|Входящие/i })).toBeVisible();
});
