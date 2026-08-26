import { apiFetch } from "./client";

export type CoreForm = {
  id: string;
  account_id: string;
  organization_id: string;
  provider_id?: string;
  manager_id?: string;
  counterparty_id?: string;
  status: string;
  direction: string;
  kind: string;
  invoice_amount?: string;
  currency?: string;
  contract_number?: string;
  contract_date?: string;
  created_at: string;
  updated_at: string;
};

export type CreateFormInput = {
  direction: string;
  kind: string;
  invoice_amount: string;
  currency: string;
  no_documents?: boolean;
  contract_number?: string;
  contract_date?: string;
};

export function listForms(): Promise<CoreForm[]> {
  return apiFetch<CoreForm[]>("/api/v1/forms");
}

export function getForm(id: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${id}`);
}

export function createForm(input: CreateFormInput): Promise<CoreForm> {
  return apiFetch<CoreForm>("/api/v1/forms", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function transitionForm(id: string, action: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${id}/actions/${action}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
