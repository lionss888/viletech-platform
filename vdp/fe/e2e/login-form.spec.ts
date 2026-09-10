import { expect, test } from "./fixtures/auth.fixture";

test.describe("app login form", () => {
  test("login fields start empty (no seed prefill)", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Вход в платформу" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue("");
    await expect(page.getByLabel("Пароль")).toHaveValue("");
  });

  test("user@vdp.local submits form and reaches dashboard", async ({ page, loginAs }) => {
    await loginAs("user");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
