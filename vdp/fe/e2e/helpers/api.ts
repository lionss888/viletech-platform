const CORE_URL = (process.env.CORE_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const ORG_ID = "66666666-6666-6666-6666-666666666666";
const PROVIDER_ID = "55555555-5555-5555-5555-555555555555";

export type ApiTokens = {
  user: string;
  ico: string;
  eco: string;
  manager: string;
  provider: string;
  root: string;
};

async function loginApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${CORE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login ${email} failed: ${res.status}`);
  }
  const json = (await res.json()) as { token: string };
  return json.token;
}

export async function loginAllRoles(): Promise<ApiTokens> {
  const [user, ico, eco, manager, provider, root] = await Promise.all([
    loginApi("user@vdp.local", "user"),
    loginApi("ico@vdp.local", "ico"),
    loginApi("eco@vdp.local", "eco"),
    loginApi("manager@vdp.local", "manager"),
    loginApi("provider@vdp.local", "provider"),
    loginApi("root@vdp.local", "root"),
  ]);
  return { user, ico, eco, manager, provider, root };
}

async function authPut(token: string, path: string, body: Record<string, unknown> = {}): Promise<void> {
  const res = await fetch(`${CORE_URL}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${path} ${res.status}: ${text}`);
  }
}

async function authPost(token: string, path: string, body: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${CORE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

async function formStatus(token: string, path: string): Promise<string> {
  const res = await fetch(`${CORE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} ${res.status}`);
  }
  const json = (await res.json()) as { status: string };
  return json.status;
}

async function advanceCompliance(tokens: ApiTokens, formId: string): Promise<void> {
  const st = await formStatus(tokens.user, `/api/v1/site/form-payment/${formId}`);
  if (st === "organization_waiting_verification") {
    await authPut(tokens.ico, `/api/v1/admin/internal-compliance-officer/organization/${ORG_ID}/approve`);
    await authPut(tokens.ico, `/api/v1/ico/form-payment/${formId}/form/start`);
    await authPut(tokens.ico, `/api/v1/ico/form-payment/${formId}/form/accept`);
  }
  await authPut(tokens.eco, `/api/v1/eco/form-payment/${formId}/form/start`);
  await authPut(tokens.eco, `/api/v1/eco/form-payment/${formId}/form/accept`);
}

/** Create draft form and run recognize_complete. */
export async function createDraftForm(tokens: ApiTokens, suffix: string): Promise<string> {
  const created = (await authPost(tokens.user, "/api/v1/site/form-payment", {
    currency: "USD",
    invoice_amount: "750",
    no_documents: true,
    contract_number: `PW-${suffix}`,
    contract_date: "2026-08-01",
  })) as { id: string };
  await authPost(tokens.user, `/api/v1/forms/${created.id}/actions/recognize_complete`, {});
  return created.id;
}

/** Draft → form_waiting_verification (org may already be approved). */
export async function createSubmittedForm(tokens: ApiTokens, suffix: string): Promise<string> {
  const id = await createDraftForm(tokens, suffix);
  await authPut(tokens.user, `/api/v1/site/form-payment/${id}/form/accept`);
  return id;
}

/** Advance to form_accepted (manager queue). */
export async function createFormAccepted(tokens: ApiTokens, suffix: string): Promise<string> {
  const id = await createSubmittedForm(tokens, suffix);
  await advanceCompliance(tokens, id);
  return id;
}

/** ECO reject → form_waiting_corrections. */
export async function createRejectedForm(tokens: ApiTokens, suffix: string): Promise<string> {
  const id = await createSubmittedForm(tokens, suffix);
  await authPut(tokens.eco, `/api/v1/eco/form-payment/${id}/form/start`);
  await authPut(tokens.eco, `/api/v1/eco/form-payment/${id}/form/reject`, {
    reason: "Playwright: уточните контракт",
    mark: "docs",
  });
  return id;
}

/** Provider-assigned form at payment_processing. */
export async function createProviderProcessingForm(tokens: ApiTokens, suffix: string): Promise<string> {
  const id = await createFormAccepted(tokens, suffix);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/order/signing`);
  await authPut(tokens.user, `/api/v1/site/form-payment/${id}/order`);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/order/start`);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/order/accept`);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/payment/received`);
  await authPost(tokens.manager, `/api/v1/forms/${id}/provider`, {
    provider_id: PROVIDER_ID,
    client_agreed: true,
  });
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/payment/start`);
  await authPut(tokens.provider, `/api/v1/provider/form-payment/${id}/payment/start`);
  return id;
}

export async function assertCoreHealthy(): Promise<void> {
  const res = await fetch(`${CORE_URL}/api/v1/health`);
  if (!res.ok) {
    throw new Error(`core health ${res.status} — run: cd vdp && make compose-up`);
  }
}
