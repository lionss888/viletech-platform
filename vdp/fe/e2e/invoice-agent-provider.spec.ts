import { expect, test } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  authPost,
  authPut,
  createFormAccepted,
  createPaymentReceivedForm,
  createSubmittedForm,
  loginAllRoles,
} from "./helpers/api";
import { expectFormStatus } from "./helpers/status";
import { waitForFormDetail } from "./helpers/form-detail";

const SEED_ORG_ID = "66666666-6666-6666-6666-666666666666";

test.describe("Invoice, agent and provider card @pilot-matrix", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("manager cannot confirm a form until an invoice is uploaded @pilot-matrix", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    const formId = await createSubmittedForm(tokens, `invoice-lock-${Date.now()}`);
    await loginAs("manager");
    await waitForFormDetail(page, formId);
    const start = page.getByRole("button", { name: "Взять заявку в проверку" });
    await expect(start).toBeVisible({ timeout: 20_000 });
    await start.click();
    await expectFormStatus(page, "form_verification", { timeout: 20_000 });
    const confirm = page.getByRole("button", { name: "Подтвердить заявку" });
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await expect(confirm).toBeDisabled();
    await expect(page.getByTestId("invoice-required-lock")).toHaveText(
      "Нужен инвойс — без него заявку не подтвердить",
    );
    await expect(page.getByRole("button", { name: "Вернуть на доработку" })).toBeEnabled();
    const chooser = page.waitForEvent("filechooser");
    await page.getByText("Загрузить документы").click();
    await (await chooser).setFiles({
      name: "scan.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n"),
    });
    await expect(confirm).toBeEnabled({ timeout: 15_000 });
    await confirm.click();
    await expectFormStatus(page, "form_accepted");
  });

  test("provider assign lists cabinet accounts without agents or a dash @pilot-matrix", async ({ page, loginAs }) => {
    const tokens = await loginAllRoles();
    await authPost(tokens.manager, "/api/v1/agents", {
      name: "For test",
      inn: `PA${Date.now()}`,
    });
    const formId = await createPaymentReceivedForm(tokens, `prov-list-${Date.now()}`);
    await loginAs("manager");
    await page.goto(`/forms/${formId}`);
    await page.getByRole("button", { name: "Назначить платёжного провайдера" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toContainText("For test");
    await expect(dialog).not.toContainText("·");
    await expect(dialog.locator("option", { hasText: "Provider Seed" })).toHaveCount(1);
    await dialog.getByRole("button", { name: "Подтвердить" }).click();
    await expect(page.getByRole("button", { name: "Назначить платёжного провайдера" })).toHaveCount(0);
    await expect(page.getByText("Провайдер: Provider Seed")).toBeVisible();
  });

  test("second form of an organization does not ask for an agency contract @pilot-matrix", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const agent = (await authPost(tokens.manager, "/api/v1/agents", {
      name: "Агент договора",
      inn: `AG${Date.now()}`,
    })) as { id: string };
    const contract = (await authPost(tokens.manager, "/api/v1/admin/contract", {
      organization_id: SEED_ORG_ID,
      type: "agency",
      status: "accepted",
      agent_id: agent.id,
      file_id: "file-agency-once",
    })) as { id: string };
    try {
      const formId = await createFormAccepted(tokens, `contract-once-${Date.now()}`);
      await authPost(tokens.manager, `/api/v1/forms/${formId}/agent`, { agent_id: agent.id });
      await authPost(tokens.manager, `/api/v1/forms/${formId}/contract/resolve`, {});
      await loginAs("user");
      await page.goto(`/forms/${formId}`);
      await expectFormStatus(page, "signing_order");
      await expect(page.getByRole("button", { name: "Загрузить агентский договор" })).toHaveCount(0);
    } finally {
      if (contract.id) {
        await authPut(tokens.manager, `/api/v1/admin/contract/${contract.id}/reject`, {
          text: "cleanup",
        });
      }
    }
  });
});
