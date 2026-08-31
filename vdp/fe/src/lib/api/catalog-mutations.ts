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
  type?: string;
};

export type CreateCounterpartyInput = {
  name: string;
  country?: string;
  inn?: string;
};

export type CreateAgentInput = {
  name: string;
  status?: string;
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
};

export type PatchAdminInput = {
  email?: string;
  role?: string;
  blocked?: boolean;
  full_name?: string;
};

export function createOrganization(input: CreateOrganizationInput): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>("/api/v1/organization", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      inn: input.inn,
      country: input.country ?? "RU",
      type: input.type ?? "client",
    }),
  });
}

export function updateOrganization(id: string, input: Partial<CreateOrganizationInput>): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteOrganization(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/organization/${id}`, { method: "DELETE" });
}

export function approveOrganization(id: string): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/internal-compliance-officer/organization/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export function blockOrganization(id: string): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/internal-compliance-officer/organization/${id}/block`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export function unApproveOrganization(id: string): Promise<CoreOrganization> {
  return apiFetch<CoreOrganization>(`/api/v1/admin/internal-compliance-officer/organization/${id}/un-approve`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export function createCounterparty(input: CreateCounterpartyInput): Promise<CoreCounterparty> {
  return apiFetch<CoreCounterparty>("/api/v1/counterparty/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCounterparty(id: string, input: CreateCounterpartyInput): Promise<CoreCounterparty> {
  return apiFetch<CoreCounterparty>(`/api/v1/counterparty/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCounterparty(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/counterparty/${id}`, { method: "DELETE" });
}

export function setCounterpartyApproval(id: string, status: string, comment?: string): Promise<CoreCounterparty> {
  return apiFetch<CoreCounterparty>(`/api/v1/counterparty/${id}/approval`, {
    method: "PUT",
    body: JSON.stringify({ status, comment: comment ?? "" }),
  });
}

export function createAgent(input: CreateAgentInput): Promise<CoreAgent> {
  return apiFetch<CoreAgent>("/api/v1/agents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createCurrency(input: CreateCurrencyInput): Promise<CoreCurrency> {
  return apiFetch<CoreCurrency>("/api/v1/currencies", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createHsCode(input: CreateHsInput): Promise<CoreHsCode> {
  return apiFetch<CoreHsCode>("/api/v1/hs-codes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createAdminAccount(input: CreateAdminInput): Promise<CoreAdminAccount> {
  return apiFetch<CoreAdminAccount>("/api/v1/admin/account", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminAccount(id: string, input: PatchAdminInput): Promise<CoreAdminAccount> {
  return apiFetch<CoreAdminAccount>(`/api/v1/admin/account/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
