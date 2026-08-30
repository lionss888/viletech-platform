import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createProviderProcessingForm, loginAllRoles } from "./helpers/api";

test.describe("Provider ACL (no client PII in UI)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("registry hides Клиент column for provider", async ({ page, loginAs }) => {
    await loginAs("provider");
    await page.goto("/forms");
    await expect(page.getByRole("columnheader", { name: "Заявка" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Клиент" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Создать заявку" })).toHaveCount(0);
  });

  test("form card shows payment requisites without participants block", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createProviderProcessingForm(tokens, `prov-${Date.now()}`);

    await loginAs("provider");
    await page.goto(`/forms/${formId}`);
    await expect(page.getByText("Реквизиты для исполнения платежа")).toBeVisible();
    await expect(page.getByText("Участники")).toHaveCount(0);
    await expect(page.getByText("Организация клиента")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Подтвердить отправку платежа" })).toBeVisible();
  });
});
