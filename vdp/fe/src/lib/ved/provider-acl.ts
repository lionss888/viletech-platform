import { PROVIDER_HIDDEN_FIELDS } from "./actions";
import { money } from "./format";
import type { Counterparty, Organization, PaymentForm } from "./types";

/** Search haystack for provider registry — no client PII fields. */
export function providerFormSearchHaystack(
  form: PaymentForm,
  orgName: string,
  cpName: string,
): string {
  return `${form.number} ${form.invoiceNumber} ${cpName} ${orgName}`;
}

/** CSV header for provider export (no «Клиент» column). */
export function providerCsvHeader(): string[] {
  return [
    "Номер",
    "Направление",
    "Статус",
    "Стадия",
    "Контрагент",
    "Страна",
    "Организация",
    "Инвойс",
    "Сумма",
    "Валюта",
    "Обновлено",
  ];
}

/** CSV row aligned with {@link providerCsvHeader}. */
export function providerCsvRow(
  form: PaymentForm,
  statusLabel: string,
  stage: string,
  cpName: string,
  cpCountry: string,
  orgName: string,
  updatedLabel: string,
): string[] {
  return [
    form.number,
    form.direction,
    statusLabel,
    stage,
    cpName,
    cpCountry,
    orgName,
    form.invoiceNumber,
    (form.amountMinor / 100).toFixed(2),
    form.currency,
    updatedLabel,
  ];
}

/** Detail facts visible to provider (payment execution context only). */
export function providerDetailFacts(form: PaymentForm): [string, string][] {
  return [
    ["Направление", form.direction === "import" ? "Импорт" : "Экспорт"],
    ["Инвойс", form.invoiceNumber],
    ["Сумма", money(form.amountMinor, form.currency)],
  ];
}

/** Payment requisites block for provider card (org/INN + counterparty bank fields, no client PII). */
export function providerPaymentRequisites(
  form: PaymentForm,
  org: Organization | undefined,
  cp: Counterparty | undefined,
): [string, string][] {
  return [
    ["Организация", org?.name ?? form.organizationId],
    ["ИНН", org?.inn ?? "—"],
    ["Сумма", money(form.amountMinor, form.currency)],
    ["Контрагент", cp?.name ?? form.counterpartyId],
    ["Страна", cp?.country ?? cp?.countryCode ?? "—"],
    ["Банк", cp?.bank ?? "—"],
    ["SWIFT", cp?.swift ?? "—"],
  ];
}

/** Documents provider may see on the card (payment proof only). */
export function providerVisibleDocuments(form: PaymentForm): PaymentForm["documents"] {
  return form.documents.filter((doc) => doc.kind === "payment");
}

export function isProviderHiddenField(field: string): boolean {
  return (PROVIDER_HIDDEN_FIELDS as readonly string[]).includes(field);
}
