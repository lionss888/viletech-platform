import { test, expect } from "@playwright/test";

test("app login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вход в платформу" })).toBeVisible();
});

test("demo login page loads", async ({ page }) => {
  await page.goto("/demo/login");
  await expect(page.getByRole("heading", { name: "Демо без бэкенда" })).toBeVisible();
});
