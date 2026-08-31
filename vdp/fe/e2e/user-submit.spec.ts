import { test, expect } from "@playwright/test";

const CORE = process.env.CORE_URL ?? "http://127.0.0.1:8080";

test("user can login and open forms registry", async ({ page, request }) => {
  const login = await request.post(`${CORE}/api/v1/auth/login`, {
    data: { email: "user@vdp.local", password: "user" },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("user@vdp.local");
  await page.getByLabel("Пароль").fill("user");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/forms");
  await expect(page.getByRole("heading", { name: /Реестр|Входящие/i })).toBeVisible();
});
