import { apiFetch } from "./client";

export type CoreForm = {
  id: string;
  account_id: string;
  organization_id: string;
  provider_id?: string;
  agent_id?: string;
  manager_id?: string;
  counterparty_id?: string;
  contract_id?: string;
  status: string;
  direction: string;
  kind: string;
  channel?: string;
  correlation_id?: string;
  invoice_amount?: string;
  currency?: string;
  payment_method?: string;
  contract_number?: string;
  contract_date?: string;
  no_documents?: boolean;
  docs_json?: string;
  invoice_json?: string;
  confirmation_hash?: string;
  confirmation_file_id?: string;
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
  organization_id?: string;
  counterparty_id?: string;
};

export type TransitionInput = {
  comment?: string;
  mark?: string;
};

export type ComplianceHistoryEntry = {
  id: string;
  form_payment_id: string;
  actor_id: string;
  from_status: string;
  to_status: string;
  comment?: string;
  created_at: string;
};

/** Lists forms visible to the current role (CanSeeForm on core). */
export function listForms(): Promise<CoreForm[]> {
  return apiFetch<CoreForm[]>("/api/v1/forms");
}

/** GET one form by id; 403 when outside visibility zone. */
export function getForm(id: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${id}`);
}

/** POST draft form; org gate may block unapproved organizations. */
export function createForm(input: CreateFormInput): Promise<CoreForm> {
  return apiFetch<CoreForm>("/api/v1/forms", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /forms/{id}/actions/{action}; mark+comment joined for compliance reject text. */
export function transitionForm(id: string, action: string, input: TransitionInput = {}): Promise<CoreForm> {
  const comment = [input.mark, input.comment].filter(Boolean).join(" · ");
  return apiFetch<CoreForm>(`/api/v1/forms/${id}/actions/${action}`, {
    method: "POST",
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

/** Manager assigns provider; client_agreed defaults true. */
export function assignProvider(formId: string, providerId: string, clientAgreed = true): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/provider`, {
    method: "POST",
    body: JSON.stringify({ provider_id: providerId, client_agreed: clientAgreed }),
  });
}

export { attachContract, resolveContractBranch, rejectContract } from "./contract";
export type { ContractType } from "./contract";

/** Status-change audit trail for a form. */
export function getComplianceHistory(formId: string): Promise<ComplianceHistoryEntry[]> {
  return apiFetch<ComplianceHistoryEntry[]>(`/api/v1/compliance-history/${formId}`);
}

/** Human confirms OCR extraction payload onto the form. */
export function confirmExtraction(formId: string, human: unknown): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/extraction/confirm`, {
    method: "POST",
    body: JSON.stringify({ human }),
  });
}

/** Starts async extraction side-path for form documents. */
export function startExtraction(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/extraction/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** Cancels in-flight extraction without changing form status machine. */
export function cancelExtraction(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/extraction/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type PatchFormInput = {
  counterparty_id?: string;
  organization_id?: string;
  invoice_amount?: string;
  currency?: string;
  payment_method?: string;
  contract_number?: string;
  contract_date?: string;
  direction?: string;
  kind?: string;
};

/** Nest-compatible PATCH; nestPrefix is site|manager|admin|… matching the caller role. */
export function patchForm(formId: string, nestPrefix: string, input: PatchFormInput): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/${nestPrefix}/form-payment/${formId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Maps JWT role to Nest path prefix (site|manager|provider|eco|ico|admin). */
export function nestFormPrefixForRole(role: string | undefined): string {
  switch (role) {
    case "user":
      return "site";
    case "manager":
    case "treasurer":
      return "manager";
    case "provider":
    case "senior_provider":
      return "provider";
    case "compliance_officer":
      return "eco";
    case "internal_compliance_officer":
      return "ico";
    case "root":
      return "admin";
    default:
      return "site";
  }
}

/** Attach TN VED codes onto form invoice_json.hs_codes. */
export function attachFormHsCodes(formId: string, codes: string[]): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/hs-codes`, {
    method: "PATCH",
    body: JSON.stringify({ codes }),
  });
}
