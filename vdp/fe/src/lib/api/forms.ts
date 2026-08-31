import { apiFetch } from "./client";
import type { CoreForm, FormListItem } from "./types";

export type CreateFormInput = {
  direction?: string;
  kind?: string;
  invoice_amount?: string;
  currency?: string;
  no_documents?: boolean;
  contract_number?: string;
  contract_date?: string;
};

export async function listFormsApi(token: string): Promise<FormListItem[]> {
  return apiFetch<FormListItem[]>("/api/v1/forms", { token });
}

export async function getFormApi(token: string, id: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${encodeURIComponent(id)}`, { token });
}

export async function createFormApi(token: string, input: CreateFormInput): Promise<CoreForm> {
  return apiFetch<CoreForm>("/api/v1/forms", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function transitionFormApi(
  token: string,
  id: string,
  action: string,
  comment?: string,
): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${encodeURIComponent(id)}/actions/${encodeURIComponent(action)}`, {
    method: "POST",
    token,
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

export async function assignProviderApi(
  token: string,
  id: string,
  providerId: string,
  clientAgreed: boolean,
): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${encodeURIComponent(id)}/provider`, {
    method: "POST",
    token,
    body: JSON.stringify({ provider_id: providerId, client_agreed: clientAgreed }),
  });
}

export async function nestPutApi(token: string, nestRole: string, formId: string, path: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/${nestRole}/form-payment/${encodeURIComponent(formId)}/${path}`, {
    method: "PUT",
    token,
    body: JSON.stringify({}),
  });
}

export async function getFormHistoryApi(
  token: string,
  formId: string,
): Promise<Array<{ id: string; from_status: string; to_status: string; comment?: string; created_at: string }>> {
  return apiFetch(`/api/v1/compliance-history/${encodeURIComponent(formId)}`, { token });
}
