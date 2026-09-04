import { expect, test } from "@playwright/test";

test.describe("app login form", () => {
  test("user@vdp.local submits form and reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Вход в платформу" })).toBeVisible();
    await page.getByLabel("E-mail").fill("user@vdp.local");
    await page.getByLabel("Пароль").fill("user");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
