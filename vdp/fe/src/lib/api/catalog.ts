import { apiFetch } from "./client";

export type CoreOrganization = {
  id: string;
  name: string;
  inn?: string;
  legal_address?: string;
  status?: string;
  blocked?: boolean;
  is_active?: boolean;
  fields_frozen?: boolean;
  business_form?: string;
  phone?: string;
  email?: string;
  signer_name?: string;
  signer_position?: string;
  signer_other_position?: string;
  client_type?: "ui" | "bank";
  bank_fixed_commission_percent?: string;
  apply_platform_markup?: boolean;
  default_agent_id?: string;
  bank_webhook_url?: string;
  created_at?: string;
};

export type CoreCounterparty = {
  id: string;
  name: string;
  country?: string;
  country_code?: string;
  status?: string;
  last_approval_status?: string;
  inn?: string;
  banks?: string | CounterpartyBankCore[];
};

export type CounterpartyBankCore = {
  uuid?: string;
  name?: string;
  swift?: string;
  accounts?: Array<{ uuid?: string; number?: string; currency?: string; iban?: string }>;
};

export type CoreAgent = {
  id: string;
  name: string;
  inn?: string;
  active?: boolean;
  country?: string;
  corridors?: string;
  contact?: string;
  sla_hours?: number;
  status?: string;
};

export type CoreCurrency = {
  id: string;
  code: string;
  name?: string;
};

export type CoreHsCode = {
  id: string;
  code: string;
  title?: string;
};

export type CoreAdminAccount = {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  account_kind?: string;
  blocked?: boolean;
  created_at?: string;
  business_cap_overrides?: string[] | null;
  system_cap_overrides?: string[] | null;
  effective_capabilities?: {
    business?: string[];
    system?: string[];
    influence?: string;
  };
};

export function listOrganizations(): Promise<CoreOrganization[]> {
  return apiFetch<CoreOrganization[]>("/api/v1/organizations");
}

/** Scoped list (CreatedBy for user; all for compliance/root). No demo mock fallback. */
export async function listCounterparties(): Promise<CoreCounterparty[]> {
  const body = await apiFetch<{ items?: CoreCounterparty[]; total?: number } | CoreCounterparty[]>(
    "/api/v1/counterparty/list",
  );
  if (Array.isArray(body)) return body;
  return body.items ?? [];
}

export function listAgents(): Promise<CoreAgent[]> {
  return apiFetch<CoreAgent[]>("/api/v1/agents");
}

export function listCurrencies(): Promise<CoreCurrency[]> {
  return apiFetch<CoreCurrency[]>("/api/v1/currencies");
}

export function listHsCodes(): Promise<CoreHsCode[]> {
  return apiFetch<CoreHsCode[]>("/api/v1/hs-codes");
}

export function listAdminAccounts(): Promise<CoreAdminAccount[]> {
  return apiFetch<CoreAdminAccount[]>("/api/v1/admin/account");
}
