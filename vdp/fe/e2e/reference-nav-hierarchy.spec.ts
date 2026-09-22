import { expect, test } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";

/**
 * Nested «Справочники» for manager — outside narrow PR-smoke.
 * Covered by make ci-main (full Playwright).
 */
test.describe("reference nav hierarchy", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager expands Organizations and opens root agent org", async ({ page, loginAs }) => {
    await loginAs("manager");
    await page.getByTestId("nav-refs-toggle").click();
    await page.getByTestId("nav-group-organizations").click();
    await page.getByTestId("nav-leaf-agent-organization").click();
    await expect(page).toHaveURL(/\/agent-organization/);
    await expect(page.getByTestId("agent-org-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("agent-org-name")).toContainText("ООО Агент ВЭД");
    await expect(page.getByTestId("agent-org-inn")).toContainText("7700000002");
  });

  test("manager menu has no global application documents catalog", async ({ page, loginAs }) => {
    await loginAs("manager");
    await page.getByTestId("nav-refs-toggle").click();
    await expect(page.getByRole("link", { name: "Документы", exact: true })).toHaveCount(0);
    await page.getByTestId("nav-group-documents").click();
    await expect(page.getByTestId("nav-leaf-agent-reports")).toBeVisible();
    await expect(page.getByTestId("nav-leaf-payment-orders")).toBeVisible();
    await expect(page.getByTestId("nav-leaf-bank-certificate")).toBeVisible();
  });

  test("agent report outside period is not shown", async ({ page, loginAs }) => {
    await loginAs("manager");
    await page.goto("/agent-reports");
    await page.getByTestId("agent-reports-from").fill("2030-01-01");
    await page.getByTestId("agent-reports-to").fill("2030-01-31");
    await page.getByTestId("agent-reports-show").click();
    await expect(page.getByTestId("agent-reports-empty")).toBeVisible();
    await expect(page.getByText("За этот период отчётов нет")).toBeVisible();
  });

  test("root sees outside accounts on agent organization screen", async ({ page, loginAs }) => {
    await loginAs("root");
    await page.goto("/agent-organization");
    await expect(page.getByTestId("agent-org-root-outside")).toContainText("Вне учётных записей");
    await expect(page.getByTestId("agent-org-card")).toHaveCount(0);
  });
});
