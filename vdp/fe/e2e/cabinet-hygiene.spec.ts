import { test, expect } from "./fixtures/auth.fixture";
import {
  assertCoreHealthy,
  authPost,
  createPersistedDraftForm,
  loginAllRoles,
  patchFormApi,
} from "./helpers/api";
import { waitForFormDetail } from "./helpers/form-detail";
import { fillInvoiceAndReachParties } from "./helpers/wizard";
import { expectFormStatus } from "./helpers/status";

test.describe("UAT cabinet hygiene F2/F3/F6/F7/F11", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("F2: wizard default org is seed ООО Пример first", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await fillInvoiceAndReachParties(page, "advance", `hygiene-f2-${Date.now()}.pdf`);
    const orgSelect = page.locator('[data-testid="wizard-parties-step"] select').first();
    await expect(orgSelect).toBeVisible();
    const selectedText = await orgSelect.locator("option:checked").textContent();
    expect(selectedText ?? "").toMatch(/ООО\s*Пример/);
    const options = await orgSelect.locator("option").allTextContents();
    const seedIdx = options.findIndex((t) => /ООО\s*Пример/.test(t));
    const inlineIdx = options.findIndex((t) => /Inline Org/i.test(t));
    expect(seedIdx).toBeGreaterThanOrEqual(0);
    if (inlineIdx >= 0) {
      expect(seedIdx).toBeLessThan(inlineIdx);
    }
  });

  test("F3: changing counterparty keeps organization selection", async ({ page, loginAs }) => {
    await loginAs("user");
    await page.goto("/forms/new");
    await fillInvoiceAndReachParties(page, "advance", `hygiene-f3-${Date.now()}.pdf`);
    const parties = page.getByTestId("wizard-parties-step");
    const orgSelect = parties.locator("select").nth(0);
    const cpSelect = parties.locator("select").nth(1);
    const orgBefore = await orgSelect.inputValue();
    expect(orgBefore).toBeTruthy();
    const cpCount = await cpSelect.locator("option").count();
    test.skip(cpCount < 2, "need ≥2 counterparties to switch");
    const currentCp = await cpSelect.inputValue();
    const otherValue = await cpSelect.locator("option").evaluateAll((opts, cur) => {
      for (const o of opts) {
        const el = o as HTMLOptionElement;
        if (el.value && el.value !== cur) return el.value;
      }
      return "";
    }, currentCp);
    test.skip(!otherValue, "no alternate counterparty option");
    await cpSelect.selectOption(otherValue);
    await expect(orgSelect).toHaveValue(orgBefore);
  });

  test("F6/F7: invoice label separate from contract; no create FAB on detail", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const stamp = Date.now();
    const formId = await createPersistedDraftForm(tokens, `inv-hygiene-${stamp}`, {
      amount: "120",
      currency: "CNY",
    });
    const invoiceJson = JSON.stringify({
      schema_version: 1,
      header: { invoice_number: `INV-HYG-${stamp}`, invoice_amount: "120" },
    });
    await patchFormApi(tokens.user, formId, {
      contract_number: `CTR-HYG-${stamp}`,
      invoice_json: invoiceJson,
    });

    await loginAs("user");
    await waitForFormDetail(page, formId);
    await expect(page.getByTestId("create-fab")).toHaveCount(0);
    await expect(page.getByTestId("create-form-cta")).toHaveCount(0);
    await expect(page.getByText("Инвойс", { exact: true })).toBeVisible();
    await expect(page.getByText(`INV-HYG-${stamp}`)).toBeVisible();
    await expect(page.getByText(`CTR-HYG-${stamp}`)).toBeVisible();
  });

  test("F11: root cancels draft via cancel_by_manager; foreign role forbidden", async ({
    page,
    loginAs,
  }) => {
    const tokens = await loginAllRoles();
    const formId = await createPersistedDraftForm(tokens, `root-cancel-${Date.now()}`, {
      amount: "33",
      currency: "USD",
    });
    // Canonical API path used by UI bridge (not POST …/actions/root_cancel).
    await authPost(tokens.root, `/api/v1/forms/${formId}/actions/cancel_by_manager`, {
      comment: "UAT F11 root cancel",
    });
    await loginAs("root");
    await waitForFormDetail(page, formId);
    await expectFormStatus(page, /canceled_by_manager/, { timeout: 20_000 });

    const formId2 = await createPersistedDraftForm(tokens, `root-forbid-${Date.now()}`, {
      amount: "34",
      currency: "USD",
    });
    let forbidden = false;
    try {
      await authPost(tokens.user, `/api/v1/forms/${formId2}/actions/cancel_by_manager`, {
        comment: "should fail",
      });
    } catch (err) {
      forbidden = String(err).includes("403") || String(err).includes("FORBIDDEN");
    }
    expect(forbidden).toBe(true);
  });
});
