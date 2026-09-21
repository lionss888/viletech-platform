import { expect, test } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";

/**
 * Root identity card on Profile — outside org accounts.
 * Spec is outside narrow PR-smoke; covered by make ci-main (full Playwright).
 */
test.describe("root profile identity card", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("root opens Profile from menu and sees place outside accounts", async ({ page, loginAs }) => {
    await loginAs("root");
    await page.getByRole("button", { name: "Меню пользователя" }).click();
    await page.getByRole("menuitem", { name: "Профиль" }).click();
    await expect(page).toHaveURL(/\/profile/);
    const card = page.getByTestId("root-profile-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText("Root Admin");
    await expect(card).toContainText("Суперадмин");
    await expect(card).toContainText("root@vdp.local");
    await expect(page.getByTestId("root-profile-place")).toHaveText("Вне учётных записей");
    await expect(card.getByText(/организац/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Профиль" })).toBeVisible();
    await expect(page.getByText("Суперадмин").first()).toBeVisible();
  });

  test("manager profile stays notifications-only without root card", async ({ page, loginAs }) => {
    await loginAs("manager");
    await page.goto("/profile");
    await expect(page.getByTestId("root-profile-card")).toHaveCount(0);
    await expect(page.getByText("Привязка Telegram и уведомления")).toBeVisible();
  });
});
