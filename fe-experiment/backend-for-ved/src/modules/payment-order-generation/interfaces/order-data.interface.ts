/**
 * Payment order template data interface
 * Used for rendering order.pug template with properly typed data
 */
export interface IOrderData {
  orderNumber: string | number;
  orderDate: string;
  clientOrganizationBusinessForm?: string;
  clientOrganizationName: string;
  clientSignerName: string;
  agentOrganizationName: string;
  agentContractNumber: string;
  agentContractDate: string;
  counterpartyName: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  counterpartyCurrencyIcon: string;
  amount: string;
  counterpartyCurrency: string;
  bankName: string;
  swiftCode: string;
  accountNumber: string;
  currencyRate: number | null;
  currencyFeeRate: number | null;
  feePercent: number | null;
  feeFix: number | null;
  coverAmount: string;
  clientCurrencyIcon: string;
  clientCurrency: string;
  feeFixCurrency?: string;
  feeAmount: string;
  feePaymentText?: string;
  isImport: boolean;
}

/**
 * Input for PDF creation
 */
export interface ICreatePdfInput {
  text: string;
}
