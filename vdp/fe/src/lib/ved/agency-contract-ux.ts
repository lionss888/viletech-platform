/** Whether user should be offered agency-contract upload CTAs. */
export function shouldOfferAgencyContractUpload(input: {
  status: string;
  contractId?: string | null;
  orgHasAcceptedAgency?: boolean;
}): boolean {
  const st = input.status;
  if (st !== "contract_waiting" && st !== "contract_waiting_correction") {
    return false;
  }
  if (input.orgHasAcceptedAgency) {
    return false;
  }
  // Reused accepted contract already linked — no upload ask.
  if (st === "contract_waiting" && input.contractId) {
    return false;
  }
  return true;
}

/** Filter UI actions for agency reuse / single confirm+order CTA. */
export function filterAgencyContractActions<T extends { id: string }>(
  actions: T[],
  input: {
    status: string;
    contractId?: string | null;
    orgHasAcceptedAgency?: boolean;
  },
): T[] {
  const offerUpload = shouldOfferAgencyContractUpload(input);
  return actions.filter((action) => {
    if (action.id === "upload_contract" && !offerUpload) {
      return false;
    }
    return true;
  });
}
