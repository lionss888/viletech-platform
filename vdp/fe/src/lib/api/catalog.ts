import { apiFetch } from "./client";

export type CoreOrganization = {
  id: string;
  name: string;
  inn?: string;
  legal_address?: string;
  status?: string;
  blocked?: boolean;
  is_active?: boolean;
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
  country_code?: string;
  status?: string;
  inn?: string;
};

export type CoreAgent = {
  id: string;
  name: string;
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
  blocked?: boolean;
  created_at?: string;
};

export function listOrganizations(): Promise<CoreOrganization[]> {
  return apiFetch<CoreOrganization[]>("/api/v1/organizations");
}

export function listCounterparties(): Promise<CoreCounterparty[]> {
  return apiFetch<CoreCounterparty[]>("/api/v1/counterparties");
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
