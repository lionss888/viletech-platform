import type { CoreForm } from "./forms";
import { apiFetch } from "./client";

export type ContractType = "agency" | "subagency" | "services";

export function attachContract(
  formId: string,
  fileId: string,
  type: ContractType,
  number?: string,
  accountRef?: string,
): Promise<{ form: CoreForm; contract: Record<string, unknown> }> {
  return apiFetch(`/api/v1/forms/${formId}/contract/attach`, {
    method: "POST",
    body: JSON.stringify({
      type,
      file_id: fileId,
      number: number ?? "",
      account_ref: accountRef ?? "",
    }),
  });
}

export function resolveContractBranch(formId: string): Promise<CoreForm> {
  return apiFetch<CoreForm>(`/api/v1/forms/${formId}/contract/resolve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function acceptContract(contractId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/admin/contract/${contractId}/accept`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export function rejectContract(contractId: string, text: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/v1/admin/contract/${contractId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });
}
