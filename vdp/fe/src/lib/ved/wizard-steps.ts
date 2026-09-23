import type { ExtractionResult } from "@/lib/ved/extraction";
import type { FormCondition } from "@/lib/ved/types";

/** Wave 2 wizard order: docs first, OCR runs while user continues. */
export const WIZARD_STEPS = ["Документы", "Направление", "Стороны", "Условия", "Проверка"] as const;

/** Пояснения к каждому шагу мастера — отрабатывают ожидания пользователя. */
export const WIZARD_STEP_CAPTIONS: Record<(typeof WIZARD_STEPS)[number], string> = {
  Документы:
    "Сначала загрузите инвойс — после «Далее» распознавание пойдёт в фоне и подставит доступные поля, если удастся. Контракт можно добавить сразу или позже; без файлов укажите номер и дату договора вручную.",
  Направление: "Укажите, вы отправляете платёж за рубеж или получаете оплату из-за рубежа.",
  Стороны: "Выберите вашу организацию и иностранного контрагента — или создайте новых прямо здесь.",
  Условия: "Сумма и валюта платежа, код ТН ВЭД, дата отгрузки и условие оплаты.",
  Проверка: "Сверьте данные перед отправкой. После отправки заявка уйдёт на комплаенс-проверку.",
};

/** Create-form wizard step ids. */
export const WIZARD_STEP = {
  docs: 0,
  direction: 1,
  parties: 2,
  terms: 3,
  review: 4,
} as const;

/** Persist wizard condition as Nest payment_method. */
export function conditionToPaymentMethod(condition: FormCondition, direction?: string): string {
  if (direction === "export") {
    return "PAY_FROM_EXPORT";
  }
  return condition === "postPayment" ? "post_payment" : "advance";
}

/** Maps payment method to wizard branch condition (advance/postpay/export). */
export function paymentMethodToCondition(method: string | undefined | null): FormCondition {
  const normalized = (method ?? "").trim().toLowerCase();
  if (normalized === "post_payment" || normalized === "postpayment" || normalized === "postpay") {
    return "postPayment";
  }
  return "advance";
}

/** Invoice amount currency for core = counterparty currency (invoice currency UI removed). */
export function deriveInvoiceCurrency(clientCurrency: string, counterpartyCurrency: string): string {
  const cp = counterpartyCurrency.trim();
  if (cp) return cp;
  const client = clientCurrency.trim();
  return client || "USD";
}

export type WizardTouched = Partial<
  Record<"amount" | "counterpartyCurrency" | "invoiceNumber" | "contractNumber" | "hsCode", boolean>
>;

export type WizardPrefillSlice = {
  amount?: string;
  counterpartyCurrency?: string;
  invoiceNumber?: string;
  contractNumber?: string;
  hsCode?: string;
};

function parsePrefillNumber(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(value) ? undefined : value;
}

/** Amount from header or sum of line amounts when header total is empty. */
export function derivePrefillAmount(extraction: ExtractionResult): string | undefined {
  const headerAmount = extraction.header.invoice_amount?.trim();
  if (headerAmount) return headerAmount;
  let sum = 0;
  let hasLine = false;
  for (const line of extraction.line_items) {
    const amount = parsePrefillNumber(line.line_amount);
    if (amount === undefined) continue;
    sum += amount;
    hasLine = true;
  }
  return hasLine ? String(sum) : undefined;
}

/** Counterparty currency from header or first line with currency. */
export function derivePrefillCurrency(extraction: ExtractionResult): string | undefined {
  const headerCurrency = extraction.header.currency?.trim();
  if (headerCurrency) return headerCurrency.toUpperCase();
  for (const line of extraction.line_items) {
    const currency = line.currency?.trim();
    if (currency) return currency.toUpperCase();
  }
  return undefined;
}

/**
 * Merge OCR header (and line fallbacks) into wizard draft without overwriting touched fields.
 * Applies whenever fields are present — including degraded/HITL drafts so the user can review.
 */
export function mergeExtractionPrefill(
  current: WizardPrefillSlice,
  touched: WizardTouched,
  extraction: ExtractionResult | null,
): WizardPrefillSlice {
  if (!extraction) return current;
  const header = extraction.header ?? {};
  const next: WizardPrefillSlice = { ...current };
  const amount = derivePrefillAmount(extraction);
  if (!touched.amount && amount) {
    next.amount = amount;
  }
  const currency = derivePrefillCurrency(extraction);
  if (!touched.counterpartyCurrency && currency) {
    next.counterpartyCurrency = currency;
  }
  if (!touched.invoiceNumber && header.invoice_number?.trim()) {
    next.invoiceNumber = header.invoice_number.trim();
  }
  if (!touched.contractNumber && header.contract_number?.trim()) {
    next.contractNumber = header.contract_number.trim();
  }
  if (!touched.hsCode && header.hs_codes?.[0]?.trim()) {
    next.hsCode = header.hs_codes[0].trim();
  }
  return next;
}

/** RU label for document step given direction/kind. */
export type DocsStepInput = {
  noDocuments: boolean;
  invoiceFile?: File | null;
  contractNumber?: string;
  contractDate?: string;
  /** Demo contour may skip mandatory invoice upload. */
  skipInvoiceRequirement?: boolean;
};

/** Validates the documents wizard step (invoice-first or manual contract fields). */
export function validateDocsStep(input: DocsStepInput): { message: string; fields: string[] } | null {
  const fields: string[] = [];
  const messages: string[] = [];
  if (!input.noDocuments && !input.skipInvoiceRequirement && !input.invoiceFile) {
    fields.push("invoiceFile");
    messages.push("Загрузите инвойс или выберите «У меня нет документов»");
  }
  if (input.noDocuments) {
    if (!input.contractNumber?.trim()) fields.push("contractNumber");
    if (!input.contractDate?.trim()) fields.push("contractDate");
    if (fields.length > 0) {
      messages.push("Без документов укажите номер и дату контракта вручную");
    }
  }
  if (messages.length === 0) return null;
  return { message: messages.join(". "), fields };
}

export function documentsLabel(noDocuments: boolean, hasInvoice: boolean, hasContract: boolean): string {
  if (noDocuments) return "Без файлов (ручной контракт)";
  if (hasInvoice && hasContract) return "Инвойс + контракт";
  if (hasInvoice) return "Только инвойс";
  if (hasContract) return "Только контракт";
  return "Документы не выбраны";
}
