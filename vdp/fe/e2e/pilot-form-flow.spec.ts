import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createCompletedForm,
  createCounterpartyApi,
  createDraftForm,
  createPersistedDraftForm,
  createProviderProcessingForm,
  createSubmittedForm,
  loginAllRoles,
  purgeDemoMockCounterparties,
  uploadAndAttachInvoice,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const REJECT_FOR_CORRECTIONS = /Вернуть на доработку|Вернуть на коррекцию/i;
const CONFIRM_FORM = /Подтвердить заявку/;
const AFTER_SUBMIT = /^(organization_waiting_verification|form_waiting_verification)$/;
const AFTER_RESUBMIT = /^(organization_waiting_verification|form_waiting_verification)$/;
const MOCK_CP = /Shenzhen Kaiyuan|Anadolu Makina|Emirates General Trading/i;

async function waitForFormDetail(page: Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

/**
 * Pilot UI journeys (@pilot-flow): default actors User → Manager → Provider + Root.
 * Run: make playwright-pilot  (PLAYWRIGHT_ARGS='--grep @pilot-flow')
 */
test.describe("Pilot form flow @pilot-flow", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("S-User-01 wizard parties: no mock counterparties @pilot-flow", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.root);
    await createCounterpartyApi(tokens.user, { name: `Pilot CP ${Date.now()}`, country: "CN" });

    await loginAs("user");
    await page.goto("/forms/new");
    await expect(page.getByRole("heading", { name: /Новая платёжная заявка/i })).toBeVisible();
    await page.getByRole("button", { name: "Далее" }).click();
    await expect(page.getByTestId("wizard-parties-step")).toBeVisible();
    const cpSelect = page.getByTestId("wizard-parties-step").locator("label").filter({ hasText: /Контрагент/i }).locator("select");
    await expect(cpSelect).toBeVisible();
    const optionsText = await cpSelect.innerText();
    expect(optionsText).not.toMatch(MOCK_CP);
  });

  test("S-Pilot-E2E handoff user manager user manager provider @pilot-flow", async ({
    page,
    loginAs,
    logout,
  }) => {
    test.setTimeout(180_000);
    const tokens = await loginAllRoles();
    const formId = await createDraftForm(tokens, `pilot-${Date.now()}`);

    // 1. User submit
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expectFormStatus(page, AFTER_SUBMIT, { timeout: 20_000 });

    // 2. Manager take → reject
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    const take = page.getByRole("button", { name: TAKE_IN_REVIEW });
    await expect(take).toBeVisible({ timeout: 20_000 });
    await take.click();
    const rejectBtn = page.getByRole("button", { name: REJECT_FOR_CORRECTIONS });
    await expect(rejectBtn).toBeVisible({ timeout: 20_000 });
    await rejectBtn.click();
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("Pilot: догрузите инвойс");
    const markSelect = page.locator("label").filter({ hasText: /Отметка/ }).locator("select");
    if (await markSelect.isVisible().catch(() => false)) {
      await markSelect.selectOption({ index: 1 });
    }
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expectFormStatus(page, "form_waiting_corrections", { timeout: 20_000 });

    // 3. User corrections: upload CTA + resubmit
    await logout();
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("form-doc-upload")).toBeAttached({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Отправить исправления" })).toBeVisible();
    await page.getByRole("button", { name: "Отправить исправления" }).click();
    await expectFormStatus(page, AFTER_RESUBMIT, { timeout: 20_000 });

    // 4. Manager take → accept (continuity)
    await logout();
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    const takeAgain = page.getByRole("button", { name: TAKE_IN_REVIEW });
    await expect(takeAgain).toBeVisible({ timeout: 20_000 });
    await takeAgain.click();
    const confirm = page.getByRole("button", { name: CONFIRM_FORM });
    await expect(confirm).toBeEnabled({ timeout: 20_000 });
    await confirm.click();
    await expectFormStatus(page, "form_accepted", { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Назначить платёжного агента" })).toBeVisible();

    // 5. Provider: seed to processing, ACL + execute spot
    await logout();
    const processingId = await createProviderProcessingForm(tokens, `pilot-prov-${Date.now()}`);
    await loginAs("provider");
    await waitForFormDetail(page, processingId);
    await expect(page.getByText("Реквизиты платежа (без ПДн клиента)")).toBeVisible();
    await expect(page.getByText("Организация клиента")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Платёж отправлен" })).toBeVisible();
    await page.getByRole("button", { name: "Платёж отправлен" }).click();
    await expectFormStatus(page, "payment_sent", { timeout: 20_000 });

    // 6. Manager: completed badge on API-closed form
    await logout();
    const completedId = await createCompletedForm(tokens, `pilot-done-${Date.now()}`);
    await loginAs("manager");
    await waitForFormDetail(page, completedId);
    await expectFormStatus(page, "completed", { timeout: 20_000 });
  });

  test("S-Mgr-04 PDF preview iframe @pilot-flow", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `pilot-pdf-${Date.now()}`);
    await uploadAndAttachInvoice(tokens.user, formId);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await page.getByRole("button", { name: "Посмотреть" }).click();
    await expect(page.locator("iframe")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Demo: предпросмотр|предпросмотр без файла/i)).toHaveCount(0);
  });

  test("S-Prov-02 provider execute payment spot @pilot-flow", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createProviderProcessingForm(tokens, `prov-exec-${Date.now()}`);

    await loginAs("provider");
    await waitForFormDetail(page, formId);
    await expect(page.getByRole("button", { name: "Платёж отправлен" })).toBeVisible();
    await page.getByRole("button", { name: "Платёж отправлен" }).click();
    await expectFormStatus(page, "payment_sent", { timeout: 20_000 });
  });

  test("S-Root-01 catalogs Add and Bank API copy @pilot-flow", async ({ page, loginAs }) => {
    await loginAs("root");
    await page.goto("/counterparties");
    await expect(page.getByRole("heading", { name: /Контрагенты/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить" })).toBeVisible();

    await page.goto("/providers");
    await expect(page.getByRole("heading", { name: /Провайдеры/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить" })).toBeVisible();

    await page.goto("/organizations");
    await expect(page.getByText(/Канал Bank API \(интеграция\)/i)).toBeVisible();
  });

  test("S-Root-02 root cancel from card @pilot-flow", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `root-cancel-${Date.now()}`);

    await loginAs("root");
    await waitForFormDetail(page, formId);
    await expect(page.getByText("Администрирование")).toBeVisible();
    await page.getByRole("button", { name: "Отменить заявку" }).click();
    await expect(page.getByText(/Отменить заявку от имени администратора/i)).toBeVisible();
    await page.getByPlaceholder("Что именно нужно исправить или предоставить").fill("Pilot: root cancel e2e");
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expectFormStatus(page, "canceled_by_manager", { timeout: 20_000 });
  });

  test("S-User-02 draft controls visible @pilot-flow", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const cp = await createCounterpartyApi(tokens.user, {
      name: `Pilot draft CP ${Date.now()}`,
      country: "CN",
    });
    const formId = await createPersistedDraftForm(tokens, `pilot-draft-${Date.now()}`, {
      amount: "100",
      currency: "USD",
      counterpartyId: cp.id,
    });

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("change-organization")).toBeVisible();
    await expect(page.getByTestId("edit-form-action")).toBeVisible();
    await expect(page.getByTestId("form-doc-upload")).toBeAttached();
    await expect(page.getByTestId("extraction-controls")).toBeVisible();
  });
});
