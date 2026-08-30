import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createDraftForm, createFormAccepted, loginAllRoles } from "./helpers/api";

test.describe("Happy path (app UI)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("user submits draft; eco accepts; manager sees assign agent CTA", async ({ page, loginAs, logout }) => {
    const tokens = await loginAllRoles();
    const formId = await createDraftForm(tokens, `happy-${Date.now()}`);

    await loginAs("user");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByRole("button", { name: "Отправить заявку на проверку" })).toBeVisible();
    await page.getByRole("button", { name: "Отправить заявку на проверку" }).click();
    await expect(
      page
        .locator('[title="Отправлено на проверку компании"], [title="Заявка на проверке"]')
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await logout();
    await loginAs("compliance_officer");
    await page.goto(`/forms/${formId}`);
    await page.getByRole("button", { name: "Взять сделку в проверку" }).click();
    await page.getByRole("button", { name: "Подтвердить условия сделки" }).click();
    await expect(page.locator('[title="Сделка подтверждена"]').first()).toBeVisible({ timeout: 15_000 });

    await logout();
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByRole("button", { name: "Назначить платёжного агента" })).toBeVisible();
  });

  test("manager opens form_accepted from API seed", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createFormAccepted(tokens, `mgr-${Date.now()}`);

    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByRole("button", { name: "Назначить платёжного агента" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Прикрепить договор вручную" })).toBeVisible();
  });
});
