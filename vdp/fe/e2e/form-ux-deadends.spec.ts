import { test, expect } from "./fixtures/auth.fixture";
import { waitForFormDetail } from "./helpers/form-detail";
import {
  assertCoreHealthy,
  authPut,
  createCounterpartyApi,
  createDraftForm,
  createPersistedDraftForm,
  createRejectedForm,
  createSubmittedForm,
  loginAllRoles,
  purgeDemoMockCounterparties,
  uploadAndAttachInvoice,
} from "./helpers/api";


/** S-User-01..04 / S-Mgr-01 SubjectReview — companion to pilot-form-flow (@pilot-flow). */
test.describe("Form UX dead-ends (journeys)", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("S-User-01 counterparties: no Shenzhen mock bleed; empty CTA when writable", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    await purgeDemoMockCounterparties(tokens.root);
    const scopedName = `Scoped CP ${Date.now()}`;
    await createCounterpartyApi(tokens.user, { name: scopedName, country: "CN" });

    await loginAs("user");
    await page.goto("/counterparties");
    await expect(page.getByRole("heading", { name: /Контрагенты/i })).toBeVisible();
    await expect(page.getByText(scopedName)).toBeVisible();
    await expect(page.locator("tbody")).not.toContainText(/Shenzhen Kaiyuan/i);
    await expect(page.getByRole("button", { name: "Добавить" })).toBeVisible();
  });

  test("S-User-02 draft: org change, edit CTA, upload and OCR controls", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const cp = await createCounterpartyApi(tokens.user, {
      name: `Deadend CP ${Date.now()}`,
      country: "CN",
    });
    const formId = await createPersistedDraftForm(tokens, `deadend-${Date.now()}`, {
      amount: "100",
      currency: "USD",
      counterpartyId: cp.id,
    });

    await loginAs("user");
    await waitForFormDetail(page, formId);

    await expect(page.getByTestId("change-organization")).toBeVisible();
    await expect(page.getByTestId("edit-form-action")).toBeVisible();
    await expect(page.getByTestId("form-doc-upload")).toBeAttached();
    await page.getByTestId("extraction-dialog-trigger").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("extraction-controls")).toBeVisible();
    await expect(page.getByRole("button", { name: /Запустить распознавание|Перезапустить/i })).toBeVisible();
  });

  test("S-User-04 corrections: upload available after return to corrections", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createRejectedForm(tokens, `corr-upload-${Date.now()}`);

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByTitle(/Возвращена на (коррекцию|доработку)/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("form-doc-upload")).toBeAttached({ timeout: 20_000 });
    await expect(page.getByText(/Загрузите файлы здесь|Загрузить документы/i).first()).toBeVisible();
  });

  test("S-Mgr-01 manager: interactive SubjectReview (not read-only only)", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `mgr-subj-${Date.now()}`);
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    await expect(page.getByText(/Проверка участников сделки/i)).toBeVisible();
    await expect(
      page.getByText(/Действия по участникам доступны ролям проверки \(ВКО\/КО\)/i),
    ).toHaveCount(0);
  });

  test("UAT F3: manager Проверить CP updates badge to Проверен @uat-f3", async ({ page, loginAs }) => {
    test.setTimeout(90_000);
    const tokens = await loginAllRoles();
    const stamp = Date.now();
    const cpName = `F3 CP ${stamp}`;
    const cp = await createCounterpartyApi(tokens.user, { name: cpName, country: "CN" });
    const formId = await createPersistedDraftForm(tokens, `f3-cp-${stamp}`, {
      amount: "80",
      currency: "USD",
      counterpartyId: cp.id,
    });
    await uploadAndAttachInvoice(tokens.user, formId);
    // Submit via API so the journey stays on one browser session (manager).
    await authPut(tokens.user, `/api/v1/site/form-payment/${formId}/form/accept`);

    await loginAs("manager");
    await waitForFormDetail(page, formId);
    const panel = page.locator("div.panel").filter({ hasText: "Проверка участников сделки" });
    await expect(panel).toBeVisible();
    const cpRow = panel.locator("li").filter({ hasText: cpName });
    await expect(cpRow).toBeVisible({ timeout: 20_000 });
    await expect(cpRow.getByText("Не проверен")).toBeVisible();
    await cpRow.getByRole("button", { name: "Проверить" }).click();
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expect(cpRow.getByText("Проверен", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(cpRow.getByRole("button", { name: "Уже проверен" })).toBeDisabled();
  });

  test("S-User-03 timeline newest event first after submit", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createPersistedDraftForm(tokens, `tl-${Date.now()}`, {
      amount: "50",
      currency: "USD",
    });
    await uploadAndAttachInvoice(tokens.user, formId);
    await loginAs("user");
    await waitForFormDetail(page, formId);
    await page.getByRole("button", { name: "Отправить на проверку" }).click();
    await expect(page.getByTitle(/Ожидает проверки|Новая заявка/i)).toBeVisible({ timeout: 20_000 });
    const timelinePanel = page.locator("div.panel").filter({ hasText: "Хронология" });
    const submitted = timelinePanel.getByText(/Заявка отправлена на проверку/).first();
    await expect(submitted).toBeVisible({ timeout: 15_000 });
    const created = timelinePanel.getByText(/Заявка создана/).first();
    await expect(created).toBeVisible();
    const submittedBox = await submitted.boundingBox();
    const createdBox = await created.boundingBox();
    expect(submittedBox).toBeTruthy();
    expect(createdBox).toBeTruthy();
    expect(submittedBox!.y).toBeLessThan(createdBox!.y);
  });

  test("S-User-05 documents registry: PDF preview iframe and delete", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const stamp = Date.now();
    const fileLabel = `deadend-reg-${stamp}.pdf`;
    const formId = await createPersistedDraftForm(tokens, `reg-doc-${stamp}`, {
      amount: "40",
      currency: "USD",
    });
    await uploadAndAttachInvoice(tokens.user, formId, fileLabel);

    await loginAs("user");
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /Документы/i })).toBeVisible({ timeout: 20_000 });
    const row = page.locator("tbody tr").filter({ hasText: fileLabel }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole("button", { name: "Просмотр" }).click();
    await expect(page.getByText(/Нет file id|предпросмотр недоступен/i)).toHaveCount(0);
    await expect(page.locator("iframe")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Закрыть" }).click();
    await row.getByTestId("registry-doc-delete").click();
    await expect(page.locator("tbody tr").filter({ hasText: fileLabel })).toHaveCount(0, {
      timeout: 20_000,
    });
  });

  test("UAT F4: form doc delete requires confirm; cancel keeps file @uat-f4", async ({ page, loginAs }) => {
    test.setTimeout(90_000);
    const tokens = await loginAllRoles();
    const stamp = Date.now();
    const fileLabel = `f4-del-${stamp}.pdf`;
    const formId = await createPersistedDraftForm(tokens, `f4-del-${stamp}`, {
      amount: "35",
      currency: "USD",
    });
    await uploadAndAttachInvoice(tokens.user, formId, fileLabel);

    await loginAs("user");
    await waitForFormDetail(page, formId);
    const docRow = page.locator("li").filter({ hasText: fileLabel });
    await expect(docRow).toBeVisible({ timeout: 20_000 });
    await docRow.getByTestId("doc-delete").click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog.getByRole("heading", { name: "Удалить документ?" })).toBeVisible();
    await expect(confirmDialog.getByText(`«${fileLabel}» будет удалён из заявки.`)).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Отмена" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(docRow).toBeVisible();

    await docRow.getByTestId("doc-delete").click();
    await page.getByTestId("doc-delete-confirm").click();
    await expect(page.locator("li").filter({ hasText: fileLabel })).toHaveCount(0, {
      timeout: 20_000,
    });
  });

  test("UAT F2: submit disabled without docs; enabled after attach @pilot-matrix", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await createDraftForm(tokens, `submit-docs-${Date.now()}`);
    await loginAs("user");
    await waitForFormDetail(page, formId);
    const submit = page.getByRole("button", { name: "Отправить на проверку" });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(page.getByTestId("submit-docs-required-lock")).toHaveText(
      "Нужен хотя бы один документ",
    );
    await uploadAndAttachInvoice(tokens.user, formId, `submit-docs-${Date.now()}.pdf`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForFormDetail(page, formId);
    await expect(page.getByRole("button", { name: "Отправить на проверку" })).toBeEnabled();
    await expect(page.getByTestId("submit-docs-required-lock")).toHaveCount(0);
  });
});
