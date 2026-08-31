/** Manager contract branch: map form status to confirm handler plan. */
export type ContractConfirmPlan =
  | { kind: "resolve_branch" }
  | { kind: "send_order" }
  | { kind: "accept_then_send_order"; contractId: string };

/** Chooses API sequence for mgr_contract_confirm by current form status. */
export function planContractConfirm(status: string, contractId?: string): ContractConfirmPlan {
  if (status === "contract_verification") {
    if (contractId) {
      return { kind: "accept_then_send_order", contractId };
    }
    return { kind: "send_order" };
  }
  return { kind: "resolve_branch" };
}
