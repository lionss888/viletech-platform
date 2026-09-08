import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy, createDraftForm, createFormAccepted, loginAllRoles } from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const CONFIRM_FORM = /Подтвердить заявку/;
/** After submit: org may still be pending or form already in review. */
const AFTER_SUBMIT = /^(organization_waiting_verification|form_waiting_verification)$/;

async function waitForFormDetail(page: Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

/** Catalog: happy_path_to_completed (UI partial — submit → review → manager CTA). */
test.describe("Happy path (app UI)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("user submits draft; manager accepts (continuity); manager sees assign agent CTA", async ({
    page,
    loginAs,
    logout,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await createDraftForm(tokens, `happy-${Date.now()}`);

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByRole("button", { name: "Отправить на проверку" })).toBeVisible();
    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expectFormStatus(page, AFTER_SUBMIT, { timeout: 15_000 });

    await logout();
    // Pilot: ECO slot off → manager owns form review (continuity).
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    const take = page.getByRole("button", { name: TAKE_IN_REVIEW });
    await expect(take).toBeVisible({ timeout: 20_000 });
    await take.click();
    const confirm = page.getByRole("button", { name: CONFIRM_FORM });
    await expect(confirm).toBeEnabled({ timeout: 20_000 });
    await confirm.click();
    await expectFormStatus(page, "form_accepted", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Назначить платёжного агента" })).toBeVisible();
  });

  test("manager opens form_accepted from API seed", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createFormAccepted(tokens, `mgr-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByRole("button", { name: "Назначить платёжного агента" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Прикрепить договор вручную" })).toBeVisible();
    await expectFormStatus(page, "form_accepted");
  });
});
