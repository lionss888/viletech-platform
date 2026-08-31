import { createFormApi, transitionFormApi } from "@/lib/api/forms";
import type { CoreForm } from "@/lib/api/types";

export type PlatformCreateInput = {
  direction?: string;
  kind?: string;
  invoiceAmount: string;
  currency: string;
  contractNumber: string;
  contractDate: string;
  noDocuments?: boolean;
};

export async function createPlatformForm(token: string, input: PlatformCreateInput): Promise<CoreForm> {
  const created = await createFormApi(token, {
    direction: input.direction || "import",
    kind: input.kind || "good",
    invoice_amount: input.invoiceAmount,
    currency: input.currency,
    no_documents: input.noDocuments ?? true,
    contract_number: input.contractNumber,
    contract_date: input.contractDate,
  });
  const draft = await transitionFormApi(token, created.id, "recognize_complete");
  return draft;
}
