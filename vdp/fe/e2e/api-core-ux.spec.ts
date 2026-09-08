import { test, expect, type Page } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  createCounterpartyApi,
  createPersistedDraftForm,
  createSubmittedForm,
  loginAllRoles,
  uploadAndAttachInvoice,
} from "./helpers/api";

const TAKE_IN_REVIEW = /Взять (заявку|организацию) в проверку|Взять .* в проверку/i;
const REJECT_FOR_CORRECTIONS = /Вернуть на доработку|Вернуть на коррекцию/i;

async function waitForFormDetail(page: Page, formId: string): Promise<void> {
  await page.goto(`/forms/${formId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
}

test.describe("API Core UX fixes (journeys)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("app catalogs: root write controls and Bank API copy", async ({ page, loginAs }) => {
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

  test("user create persist: amount, HS and counterparty survive detail and submit", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const cpName = `Persist CP ${Date.now()}`;
    const cp = await createCounterpartyApi(tokens.user, { name: cpName, country: "CN" });
    const formId = await createPersistedDraftForm(tokens, `persist-${Date.now()}`, {
      amount: "1250.50",
      currency: "USD",
      counterpartyId: cp.id,
      hsCodes: ["8542 31 90"],
    });

    await loginAs("user");
    await waitForFormDetail(page, formId);
    const params = page.getByTestId("form-params");
    await expect(params).toContainText(/1[\s\u00a0]?250[,.]50|1250[,.]50/);
    await expect(params).toContainText("USD");
    await expect(params).toContainText("8542");
    await expect(page.getByTestId("counterparty-block")).toContainText(cpName);

    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expect(page.getByTestId("form-params")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("form-params")).toContainText(/1[\s\u00a0]?250[,.]50|1250[,.]50/);
    await expect(page.getByTestId("counterparty-block")).toContainText(cpName);
  });

  test("manager queue: Новая заявка → start → reject CTA", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `mgr-cta-${Date.now()}`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByTitle("Новая заявка")).toBeVisible({ timeout: 20_000 });
    const take = page.getByRole("button", { name: TAKE_IN_REVIEW });
    await expect(take).toBeVisible({ timeout: 20_000 });
    await take.click();
    await expect(page.getByRole("button", { name: REJECT_FOR_CORRECTIONS })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /Подтвердить/i })).toBeVisible();
    await expect(page.getByTitle("На рассмотрении")).toBeVisible({ timeout: 10_000 });
  });

  test("PDF preview: manager opens iframe when fileId attached", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `pdf-${Date.now()}`);
    await uploadAndAttachInvoice(tokens.user, formId);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await page.getByRole("button", { name: "Посмотреть" }).click();
    await expect(page.locator("iframe")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Demo: предпросмотр|предпросмотр без файла/i)).toHaveCount(0);
  });

  test("root CRUD: add counterparty via registry", async ({ page, loginAs }) => {
    const name = `Root CP ${Date.now()}`;
    await loginAs("root");
    await page.goto("/counterparties");
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.getByLabel("Наименование").fill(name);
    await page.getByLabel("Страна").fill("Китай");
    await page.getByLabel("Код страны").fill("CN");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Запись добавлена")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 });
  });
});
