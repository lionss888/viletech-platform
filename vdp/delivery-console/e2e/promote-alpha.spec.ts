import { expect, test } from "@playwright/test";

test("list environments then promote alpha", async ({ page }) => {
  await page.route("**/api/v1/auth/local", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "test-token",
        identity: { Subject: "alpha@vdp.local", Role: "deployer-alpha-preview", Issuer: "local" },
      }),
    });
  });
  await page.route("**/api/v1/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ Subject: "alpha@vdp.local", Role: "deployer-alpha-preview", Issuer: "local" }),
    });
  });
  await page.route("**/api/v1/environments", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { Name: "alpha", DigestTag: "sha-old", Mode: "on_ready", Status: "healthy", DisableHint: "" },
      ]),
    });
  });
  await page.route("**/api/v1/releases", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ Tag: "sha-new", Title: "VDP sha-new", ImagesRunID: "77", IsProduct: false }]),
    });
  });
  await page.route("**/api/v1/environments/alpha/promote", async (route) => {
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "accepted" }) });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Вход в консоль поставки" })).toBeVisible();
  await page.getByLabel("E-mail").fill("alpha@vdp.local");
  await page.getByLabel("Пароль").fill("alpha");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Среды" })).toBeVisible();
  await page.getByRole("button", { name: "Обновления" }).click();
  await expect(page.getByRole("heading", { name: "Обновления" })).toBeVisible();
  await page.getByTestId("promote-button").click();
  await expect(page.getByText(/Обновление sha-new отправлено на alpha/)).toBeVisible();
});
