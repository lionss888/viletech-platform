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

export type OrgContractRow = {
  id: string;
  status?: string;
  type?: string;
};

/** Org contract history — used to skip agency upload when accepted already exists. */
export function listOrgContracts(orgId: string): Promise<OrgContractRow[]> {
  return apiFetch<OrgContractRow[]>(`/api/v1/organizations/${orgId}/contracts`);
}

export function orgHasAcceptedAgencyContract(rows: OrgContractRow[]): boolean {
  return rows.some((row) => {
    const st = (row.status ?? "").toLowerCase();
    const typ = (row.type ?? "").toLowerCase();
    const agency = typ === "agency" || typ === "subagency" || typ === "";
    return agency && (st === "accepted" || st === "active" || st === "signed");
  });
}
