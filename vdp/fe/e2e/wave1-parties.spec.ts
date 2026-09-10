import { test, expect, type Page } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createOrganizationApi,
  createPersistedDraftForm,
  createSubmittedForm,
  loginAllRoles,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

async function waitForFormDetail(page: Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

test.describe("Wave1 parties / orgs", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("draft: user can change parties; after submit links hidden", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createPersistedDraftForm(tokens, `parties-lock-${Date.now()}`, {
      amount: "80",
      currency: "USD",
    });

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("change-organization")).toBeVisible();
    await expect(
      page.getByTestId("open-counterparty-picker").or(page.getByTestId("change-counterparty")),
    ).toBeVisible();

    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expectFormStatus(page, /organization_waiting_verification|form_waiting_verification/, {
      timeout: 20_000,
    });
    await expect(page.getByTestId("change-organization")).toHaveCount(0);
    await expect(page.getByTestId("change-counterparty")).toHaveCount(0);
    await expect(page.getByTestId("open-counterparty-picker")).toHaveCount(0);
  });

  test("manager on submitted form: no party change links", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `mgr-parties-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("change-organization")).toHaveCount(0);
    await expect(page.getByTestId("change-counterparty")).toHaveCount(0);
    await expect(page.getByTestId("open-counterparty-picker")).toHaveCount(0);
  });

  test("wizard parties: create org and CP CTAs visible", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await expect(page.getByTestId("wizard-docs-step")).toBeVisible();
    await page.getByTestId("wizard-no-documents").click();
    await page.getByLabel(/Номер контракта/i).fill(`W1-CTR-${Date.now()}`);
    await page.locator('input[type="date"]').first().fill("2026-09-01");
    await page.getByRole("button", { name: "Далее" }).click();
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-parties-step")).toBeVisible();
    await expect(page.getByTestId("wizard-create-org-btn")).toBeVisible();
    await page.getByTestId("wizard-create-cp-btn").click();
    await expect(page.getByTestId("cp-pick-create").or(page.getByTestId("cp-create-form"))).toBeVisible();
  });

  test("detail: inline org create UI + assign created org to draft", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createPersistedDraftForm(tokens, `inline-org-${Date.now()}`, {
      amount: "55",
      currency: "USD",
    });
    const stamp = Date.now();
    const orgName = `Inline Org ${stamp}`;
    const inn = `77${String(stamp).slice(-8)}`;

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await page.getByTestId("change-organization").click();
    await page.getByTestId("org-pick-create").click();
    await expect(page.getByTestId("org-create-form")).toBeVisible();
    await expect(page.getByTestId("org-create-name")).toBeVisible();
    await page.getByRole("button", { name: "Отмена" }).click();

    await createOrganizationApi(tokens.user, {
      name: orgName,
      inn,
      legal_address: "г. Москва, тест",
    });

    await waitForFormDetail(page, formId);
    await page.getByTestId("change-organization").click();
    await expect(page.getByText(orgName)).toBeVisible({ timeout: 15_000 });
    await page.locator("label").filter({ hasText: orgName }).locator('input[type="radio"]').check();
    await page.getByRole("button", { name: "Привязать к заявке" }).click();
    await expect(page.getByTestId("organization-block")).toContainText(orgName, { timeout: 20_000 });
  });
});
