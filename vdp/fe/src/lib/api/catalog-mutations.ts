import { apiFetch } from "./client";
import type {
  CoreAdminAccount,
  CoreAgent,
  CoreCounterparty,
  CoreCurrency,
  CoreHsCode,
  CoreOrganization,
} from "./catalog";

export type CreateOrganizationInput = {
  name: string;
  inn: string;
  country?: string;
  legal_address?: string;
  type?: string;
};

/** Org card fields for generated PDFs — not Account login. */
export type PatchOrganizationProfileInput = {
  business_form?: string;
  phone?: string;
  email?: string;
  signer_name?: string;
  signer_position?: string;
  signer_other_position?: string;
  legal_address?: string;
};

export type CounterpartyBankInput = {
  uuid?: string;
  name: string;
  swift?: string;
  accounts?: Array<{ uuid?: string; number?: string; currency?: string; iban?: string }>;
};

export type CreateCounterpartyInput = {
  name: string;
  country?: string;
  inn?: string;
  banks?: CounterpartyBankInput[];
};

export type CreateAgentInput = {
  name: string;
  inn?: string;
  status?: string;
  country?: string;
  corridors?: string;
  contact?: string;
  sla_hours?: number;
  active?: boolean;
};

export type CreateCurrencyInput = {
  code: string;
  name?: string;
};

export type CreateHsInput = {
  code: string;
  title?: string;
};

export type CreateAdminInput = {
  email: string;
  password: string;
  role: string;
  account_kind?: "user" | "admin";
  full_name?: string;
  business_cap_overrides?: string[];
  system_cap_overrides?: string[];
};

export type PatchAdminInput = {
  email?: string;
  role?: string;
  account_kind?: "user" | "admin";
  blocked?: boolean;
  full_name?: string;
  business_cap_overrides?: string[];
  system_cap_overrides?: string[];
  clear_business_overrides?: boolean;
  clear_system_overrides?: boolean;
};

/** POST /api/v1/organization. */
export function createOrganization(input: CreateOrganizationInput): Promise<CoreOrganization> {
  const body: Record<string, string> = {
    name: input.name,
    inn: input.inn,
    type: input.type ?? "client",
  };
  if (input.country?.trim()) {
    body.country = input.country.trim();
  }
  if (input.legal_address?.trim()) {
    body.legal_address = input.legal_address.trim();
  }
  return apiFetch<CoreOrganization>("/api/v1/organization", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PATCH /api/v1/organization/{…}. */
export function updateOrganization(id: string, input: Partial<CreateOrganizationInput>): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/organization/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** PATCH /api/v1/organization/{…}. */
export function patchOrganizationProfile(
  id: string,
  input: PatchOrganizationProfileInput,
): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/organization/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DELETE /api/v1/organization/{…}. */
export function deleteOrganization(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/organization/${id}`, { method: "DELETE" });
}

/** PUT /api/v1/admin/internal-compliance-officer/organization/{…}/approve. */
export function approveOrganization(id: string): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/internal-compliance-officer/organization/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

/** PUT /api/v1/admin/internal-compliance-officer/organization/{…}/block. */
export function blockOrganization(id: string): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/internal-compliance-officer/organization/${id}/block`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

/** PUT /api/v1/admin/internal-compliance-officer/organization/{…}/un-approve. */
export function unApproveOrganization(id: string): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/internal-compliance-officer/organization/${id}/un-approve`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

/** POST /api/v1/counterparty/create. */
export function createCounterparty(input: CreateCounterpartyInput): Promise<CoreCounterparty> {
  return apiFetch<CoreCounterparty>("/api/v1/counterparty/create", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      country: input.country,
      inn: input.inn,
      banks: input.banks ?? [],
    }),
  });
}

/** PATCH /api/v1/counterparty/{…}. */
export function updateCounterparty(id: string, input: CreateCounterpartyInput): Promise<CoreCounterparty> {
  return apiFetch<CoreCounterparty>(`/api/v1/counterparty/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      country: input.country,
      inn: input.inn,
      ...(input.banks !== undefined ? { banks: input.banks } : {}),
    }),
  });
}

/** DELETE /api/v1/counterparty/{…}. */
export function deleteCounterparty(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/counterparty/${id}`, { method: "DELETE" });
}

/** PUT /api/v1/counterparty/{…}/approval. */
export function setCounterpartyApproval(id: string, status: string, comment?: string): Promise<CoreCounterparty> {
  return apiFetch<CoreCounterparty>(`/api/v1/counterparty/${id}/approval`, {
    method: "PUT",
    body: JSON.stringify({ status, comment: comment ?? "" }),
  });
}

/** POST /api/v1/agents. */
export function createAgent(input: CreateAgentInput): Promise<CoreAgent> {
  return apiFetch<CoreAgent>("/api/v1/agents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type PatchAgentInput = {
  name?: string;
  inn?: string;
  active?: boolean;
  country?: string;
  corridors?: string;
  contact?: string;
  sla_hours?: number;
};

/** PATCH /api/v1/agents/{id} — root/manager catalog edit. */
export function updateAgent(id: string, input: PatchAgentInput): Promise<CoreAgent> {
  return apiFetch<CoreAgent>(`/api/v1/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** POST /api/v1/currencies. */
export function createCurrency(input: CreateCurrencyInput): Promise<CoreCurrency> {
  return apiFetch<CoreCurrency>("/api/v1/currencies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /api/v1/hs-codes. */
export function createHsCode(input: CreateHsInput): Promise<CoreHsCode> {
  return apiFetch<CoreHsCode>("/api/v1/hs-codes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /api/v1/admin/account. */
export function createAdminAccount(input: CreateAdminInput): Promise<CoreAdminAccount> {
  return apiFetch<CoreAdminAccount>("/api/v1/admin/account", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** PATCH /api/v1/admin/account/{…}. */
export function patchAdminAccount(id: string, input: PatchAdminInput): Promise<CoreAdminAccount> {
  return apiFetch<CoreAdminAccount>(`/api/v1/admin/account/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
