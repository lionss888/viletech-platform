import type { CoreForm } from "./forms";
import { apiFetch, loadAuthTokens, newRequestId, type AuthTokens } from "./client";
import type { CoreOrganization } from "./catalog";
import { BANK_ORG_ID, BANK_SEED_EMAIL, BANK_SEED_PASSWORD } from "@/lib/ved/bank-channel";

export { BANK_ORG_ID };

export type BankSettingsInput = {
  client_type?: "ui" | "bank";
  bank_fixed_commission_percent?: string;
  apply_platform_markup?: boolean;
  default_agent_id?: string;
  bank_webhook_url?: string;
  bank_webhook_secret?: string;
};

export function setBankSettings(orgId: string, input: BankSettingsInput): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/organizations/${orgId}/bank-settings`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export type BankCreateFormInput = {
  organization_id: string;
  counterparty_id?: string;
  invoice_amount: string;
  currency: string;
  direction?: string;
  kind?: string;
  contract_number?: string;
  contract_date?: string;
  correlation_id?: string;
  purpose?: string;
};

export type BankFormResponse = {
  id: string;
  status: string;
  channel: string;
  correlation_id?: string;
  invoice_amount?: string;
  currency?: string;
  deep_link?: string;
  updated_at?: string;
};

export function createBankForm(input: BankCreateFormInput, idempotencyKey?: string): Promise<BankFormResponse> {
  return apiFetch<BankFormResponse>("/api/v1/bank/forms", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey ?? newRequestId() },
    body: JSON.stringify(input),
  });
}

/** Uses explicit bearer token (does not mutate session storage). */
export function createBankFormWithToken(
  token: string,
  input: BankCreateFormInput,
  idempotencyKey?: string,
): Promise<BankFormResponse> {
  return apiFetch<BankFormResponse>("/api/v1/bank/forms", {
    method: "POST",
    skipAuth: true,
    headers: {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey ?? newRequestId(),
    },
    body: JSON.stringify(input),
  });
}

async function fetchBankToken(): Promise<string> {
  const session = await apiFetch<AuthTokens>("/api/v1/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email: BANK_SEED_EMAIL, password: BANK_SEED_PASSWORD }),
  });
  return session.token;
}

/**
 * Smoke helper: bank login + create for seed org without switching the current UI session.
 */
export async function smokeCreateBankForm(
  input: Omit<BankCreateFormInput, "organization_id"> & { organization_id?: string },
  idempotencyKey?: string,
): Promise<BankFormResponse> {
  const token = await fetchBankToken();
  return createBankFormWithToken(
    token,
    { ...input, organization_id: input.organization_id ?? BANK_ORG_ID },
    idempotencyKey,
  );
}

/** Creates bank form with current session (must be logged in as bank role). */
export function createBankFormAsSession(input: BankCreateFormInput, idempotencyKey?: string): Promise<BankFormResponse> {
  const tokens = loadAuthTokens();
  if (!tokens?.token) {
    throw new Error("Нужна авторизация bank@vdp.local");
  }
  return createBankFormWithToken(tokens.token, input, idempotencyKey);
}

export function listBankForms(): Promise<CoreForm[]> {
  return apiFetch<CoreForm[]>("/api/v1/bank/forms");
}
