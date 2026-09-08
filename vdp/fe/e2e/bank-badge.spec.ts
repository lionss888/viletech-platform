import { test, expect } from "./fixtures/auth.fixture";
import { assertCoreHealthy } from "./helpers/api";

const CORE_URL = (process.env.CORE_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const BANK_ORG_ID = "88888888-8888-8888-8888-888888888888";

/** Create a bank-channel form via seed bank login (API), independent of /testing UI copy. */
async function createBankFormViaApi(): Promise<{ id: string; correlationId: string }> {
  const loginRes = await fetch(`${CORE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bank@vdp.local", password: "bank" }),
  });
  if (!loginRes.ok) {
    throw new Error(`bank login ${loginRes.status}`);
  }
  const { token } = (await loginRes.json()) as { token: string };
  const correlationId = `e2e-bank-${Date.now()}`;
  const createRes = await fetch(`${CORE_URL}/api/v1/bank/forms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `e2e-bank-${Date.now()}`,
    },
    body: JSON.stringify({
      organization_id: BANK_ORG_ID,
      invoice_amount: "100",
      currency: "USD",
      contract_number: `E2E-BANK-${Date.now()}`,
      contract_date: "2026-08-01",
      correlation_id: correlationId,
    }),
  });
  if (!createRes.ok) {
    throw new Error(`bank create ${createRes.status}: ${await createRes.text()}`);
  }
  const form = (await createRes.json()) as { id: string; channel?: string };
  if (form.channel !== "bank") {
    throw new Error(`want channel=bank got ${form.channel}`);
  }
  return { id: form.id, correlationId };
}

test.describe("Bank channel badge", () => {
  test.beforeAll(async () => {
    await assertCoreHealthy();
  });

  test("root opens bank-channel form and sees Bank API badge", async ({ page, loginAs }) => {
    const { id: formId, correlationId } = await createBankFormViaApi();

    await loginAs("root");
    await page.goto(`/forms/${formId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Канал: Bank API")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(new RegExp(`corr:\\s*${correlationId}`))).toBeVisible();
  });
});
