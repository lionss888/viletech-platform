import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";

test.describe("Bank channel badge", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("root creates bank form via /testing and sees badge on card", async ({ page, loginAs }) => {
    await loginAs("root");
    await page.goto("/testing");
    await expect(page.getByRole("heading", { name: "Тестовые данные и сценарии" })).toBeVisible();
    await page.getByRole("button", { name: "Создать заявку через Bank API" }).click();
    const result = page.locator("text=/Заявка .+ создана через Bank API/");
    await expect(result).toBeVisible({ timeout: 15_000 });
    const text = await result.textContent();
    const match = text?.match(/Заявка\s+([0-9a-f-]{36})/i);
    expect(match?.[1]).toBeTruthy();
    const formId = match![1]!;
    await page.goto(`/forms/${formId}`);
    await expect(page.getByText("Канал: Bank API")).toBeVisible();
    await expect(page.getByText(/^Корр\. ID:/)).toBeVisible();
  });
});
