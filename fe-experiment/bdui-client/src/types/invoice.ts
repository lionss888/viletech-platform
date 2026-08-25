export type InvoiceDocumentKind = 'invoice' | 'contract';

export type InvoiceContractValues = {
  invoice: File | null;
  contract: File | null;
  noDocuments: boolean;
};

export type InvoiceContractPageProps = {
  onContinue?: (values: InvoiceContractValues) => void | Promise<void>;
  onEditPayment?: () => void;
  timeLabel?: string;
};

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export function formatDocumentName(name: string, maxLength = 24): string {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.slice(0, Math.max(1, maxLength - 1))}…`;
}
