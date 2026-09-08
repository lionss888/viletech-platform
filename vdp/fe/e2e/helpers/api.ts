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

/** Seed helpers keyed by scenarioverify catalog ids. */
export type ScenarioSeedId =
  | "happy_path_to_completed"
  | "eco_reject_resubmit"
  | "ico_org_pending_approve"
  | "manager_payment_assign_provider"
  | "provider_payment_no_pii"
  | "manager_hides_drafts";

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

async function tryPut(token: string, path: string, body: Record<string, unknown> = {}): Promise<boolean> {
  try {
    await authPut(token, path, body);
    return true;
  } catch {
    return false;
  }
}

async function tryPost(token: string, path: string, body: Record<string, unknown> = {}): Promise<boolean> {
  try {
    await authPost(token, path, body);
    return true;
  } catch {
    return false;
  }
}

async function advanceCompliance(tokens: ApiTokens, formId: string): Promise<void> {
  const st = await formStatus(tokens.user, `/api/v1/site/form-payment/${formId}`);
  if (st === "organization_waiting_verification" || st === "organization_verification") {
    await tryPut(tokens.ico, `/api/v1/admin/internal-compliance-officer/organization/${ORG_ID}/approve`);
    if (!(await tryPut(tokens.ico, `/api/v1/ico/form-payment/${formId}/form/start`))) {
      await authPost(tokens.manager, `/api/v1/forms/${formId}/actions/ico_start`, {});
    }
    if (!(await tryPut(tokens.ico, `/api/v1/ico/form-payment/${formId}/form/accept`))) {
      await authPost(tokens.manager, `/api/v1/forms/${formId}/actions/ico_approve`, {});
    }
  }
  const after = await formStatus(tokens.user, `/api/v1/site/form-payment/${formId}`);
  if (after === "form_accepted") return;
  if (!(await tryPut(tokens.eco, `/api/v1/eco/form-payment/${formId}/form/start`))) {
    await authPost(tokens.manager, `/api/v1/forms/${formId}/actions/eco_start`, {});
  }
  if (!(await tryPut(tokens.eco, `/api/v1/eco/form-payment/${formId}/form/accept`))) {
    await authPost(tokens.manager, `/api/v1/forms/${formId}/actions/eco_accept`, {});
  }
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

/** ECO/manager reject → form_waiting_corrections (continuity when ECO slot off). */
export async function createRejectedForm(tokens: ApiTokens, suffix: string): Promise<string> {
  const id = await createSubmittedForm(tokens, suffix);
  const body = { reason: "Playwright: уточните контракт", mark: "docs", comment: "Playwright: уточните контракт" };
  let st = await formStatus(tokens.user, `/api/v1/site/form-payment/${id}`);
  if (st === "organization_waiting_verification" || st === "organization_verification") {
    await tryPut(tokens.ico, `/api/v1/admin/internal-compliance-officer/organization/${ORG_ID}/approve`);
    if (!(await tryPut(tokens.ico, `/api/v1/ico/form-payment/${id}/form/start`))) {
      await authPost(tokens.manager, `/api/v1/forms/${id}/actions/ico_start`, {});
    }
    if (!(await tryPut(tokens.ico, `/api/v1/ico/form-payment/${id}/form/accept`))) {
      await authPost(tokens.manager, `/api/v1/forms/${id}/actions/ico_approve`, {});
    }
    st = await formStatus(tokens.user, `/api/v1/site/form-payment/${id}`);
  }
  if (st === "form_waiting_verification" || st === "form_verification") {
    if (st === "form_waiting_verification") {
      if (!(await tryPost(tokens.manager, `/api/v1/forms/${id}/actions/eco_start`, {}))) {
        await tryPut(tokens.eco, `/api/v1/eco/form-payment/${id}/form/start`);
      }
      st = await formStatus(tokens.user, `/api/v1/site/form-payment/${id}`);
    }
    if (st === "form_verification") {
      if (!(await tryPost(tokens.manager, `/api/v1/forms/${id}/actions/eco_reject`, body))) {
        if (!(await tryPut(tokens.eco, `/api/v1/eco/form-payment/${id}/form/reject`, body))) {
          throw new Error(`eco reject failed from ${st}`);
        }
      }
    }
  } else if (st === "form_accepted") {
    await authPost(tokens.manager, `/api/v1/forms/${id}/actions/manager_form_reject`, body);
  } else {
    throw new Error(`createRejectedForm: unexpected status ${st}`);
  }
  const final = await formStatus(tokens.user, `/api/v1/site/form-payment/${id}`);
  if (final !== "form_waiting_corrections") {
    throw new Error(`createRejectedForm: want form_waiting_corrections got ${final}`);
  }
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

/** API-seed a form to completed. */
export async function createCompletedForm(tokens: ApiTokens, suffix: string): Promise<string> {
  const id = await createProviderProcessingForm(tokens, suffix);
  await authPut(tokens.provider, `/api/v1/provider/form-payment/${id}/payment/sent`);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/report/signing`);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/report/accept`);
  await authPut(tokens.manager, `/api/v1/manager/form-payment/${id}/completed`);
  return id;
}

/**
 * Seed by scenarioverify catalog id for Playwright UI journeys.
 */
export async function seedForScenario(scenarioId: ScenarioSeedId, tokens: ApiTokens, suffix: string): Promise<string> {
  switch (scenarioId) {
    case "happy_path_to_completed":
      return createCompletedForm(tokens, suffix);
    case "eco_reject_resubmit":
      return createRejectedForm(tokens, suffix);
    case "ico_org_pending_approve":
      return createSubmittedForm(tokens, suffix);
    case "manager_payment_assign_provider":
      return createFormAccepted(tokens, suffix);
    case "provider_payment_no_pii":
      return createProviderProcessingForm(tokens, suffix);
    case "manager_hides_drafts":
      return createDraftForm(tokens, suffix);
    default:
      throw new Error(`unsupported scenario seed: ${scenarioId}`);
  }
}

export async function assertCoreHealthy(): Promise<void> {
  const res = await fetch(`${CORE_URL}/api/v1/health`);
  if (!res.ok) {
    throw new Error(`core health ${res.status} — run: cd vdp && make compose-up`);
  }
}

/** Create counterparty for the seed user org. */
export async function createCounterpartyApi(
  token: string,
  input: { name: string; country?: string; inn?: string },
): Promise<{ id: string; name: string }> {
  const created = (await authPost(token, "/api/v1/counterparty/create", {
    name: input.name,
    country: input.country ?? "CN",
    inn: input.inn ?? `E2E${Date.now()}`,
    banks: [],
  })) as { id: string; name: string };
  return created;
}

/** Draft with amount + counterparty + HS codes for persist UI checks. */
export async function createPersistedDraftForm(
  tokens: ApiTokens,
  suffix: string,
  opts: { amount: string; currency: string; counterpartyId: string; hsCodes: string[] },
): Promise<string> {
  const created = (await authPost(tokens.user, "/api/v1/site/form-payment", {
    currency: opts.currency,
    invoice_amount: opts.amount,
    counterparty_id: opts.counterpartyId,
    no_documents: true,
    contract_number: `PW-${suffix}`,
    contract_date: "2026-08-01",
  })) as { id: string; counterparty_id?: string };
  // PATCH ensures counterparty when create image has not yet wired CreateInput.counterparty_id.
  if (created.counterparty_id !== opts.counterpartyId) {
    const patch = await fetch(`${CORE_URL}/api/v1/site/form-payment/${created.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokens.user}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ counterparty_id: opts.counterpartyId }),
    });
    if (!patch.ok) {
      throw new Error(`patch counterparty ${patch.status}: ${await patch.text()}`);
    }
  }
  await authPost(tokens.user, `/api/v1/forms/${created.id}/actions/recognize_complete`, {});
  if (opts.hsCodes.length > 0) {
    const res = await fetch(`${CORE_URL}/api/v1/forms/${created.id}/hs-codes`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokens.user}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codes: opts.hsCodes }),
    });
    if (!res.ok) {
      throw new Error(`attach hs ${res.status}: ${await res.text()}`);
    }
  }
  return created.id;
}

/** Upload minimal PDF and attach as invoice; returns file id. */
export async function uploadAndAttachInvoice(token: string, formId: string): Promise<string> {
  const pdfBytes = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x66, 0x61, 0x6b, 0x65, 0x0a,
  ]);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const fd = new FormData();
  fd.append("file", blob, "e2e-invoice.pdf");
  fd.append("form_id", formId);
  const up = await fetch(`${CORE_URL}/api/v1/file-store/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!up.ok) {
    throw new Error(`upload ${up.status}: ${await up.text()}`);
  }
  const meta = (await up.json()) as { id: string };
  await authPost(token, `/api/v1/forms/${formId}/docs/attach`, {
    file_id: meta.id,
    kind: "invoice",
    label: "e2e-invoice.pdf",
  });
  return meta.id;
}

/** List counterparties visible to the token (for empty / no-mock asserts). */
export async function listCounterpartiesApi(token: string): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${CORE_URL}/api/v1/counterparty/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`counterparty list ${res.status}`);
  }
  const json = (await res.json()) as { items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>;
  return Array.isArray(json) ? json : (json.items ?? []);
}
