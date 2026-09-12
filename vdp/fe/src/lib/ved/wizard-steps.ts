import type { ExtractionResult } from "@/lib/ved/extraction";
import type { FormCondition } from "@/lib/ved/types";

/** Wave 2 wizard order: docs first, OCR runs while user continues. */
export const WIZARD_STEPS = ["Документы", "Направление", "Стороны", "Условия", "Проверка"] as const;

/** Пояснения к каждому шагу мастера — отрабатывают ожидания пользователя. */
export const WIZARD_STEP_CAPTIONS: Record<(typeof WIZARD_STEPS)[number], string> = {
  Документы: "Полезно:\u00a0вы можете продолжить без документов или загрузите инвойс и контракт — реквизиты подставятся автоматически.",
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
export function conditionToPaymentMethod(condition: FormCondition): string {
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

/** Merge OCR header into wizard draft without overwriting touched fields. */
export function mergeExtractionPrefill(
  current: WizardPrefillSlice,
  touched: WizardTouched,
  extraction: ExtractionResult | null,
): WizardPrefillSlice {
  if (!extraction?.header) return current;
  const header = extraction.header;
  const next: WizardPrefillSlice = { ...current };
  if (!touched.amount && header.invoice_amount?.trim()) {
    next.amount = header.invoice_amount.trim();
  }
  if (!touched.counterpartyCurrency && header.currency?.trim()) {
    next.counterpartyCurrency = header.currency.trim().toUpperCase();
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
export function documentsLabel(noDocuments: boolean, hasInvoice: boolean, hasContract: boolean): string {
  if (noDocuments) return "Без файлов (ручной контракт)";
  if (hasInvoice && hasContract) return "Инвойс + контракт";
  if (hasInvoice) return "Только инвойс";
  if (hasContract) return "Только контракт";
  return "Документы не выбраны";
}
