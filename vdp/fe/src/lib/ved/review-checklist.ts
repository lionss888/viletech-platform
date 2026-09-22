import type { AttachedDocument } from "./types";

export type ReviewCheckInput = {
  documents: Pick<AttachedDocument, "title" | "kind">[];
  hsCode: string;
  counterpartyName?: string | undefined;
  counterpartyStatus?: string | undefined;
  amountWarnings?: string[] | undefined;
};

/** Statuses where compliance/manager should take the form into review. */
export function isWaitingTakeStatus(status: string): boolean {
  return status === "form_waiting_verification" || status === "organization_waiting_verification";
}

/** Statuses where manager should take signed order into verification. */
export function isOrderWaitingTake(status: string): boolean {
  return (
    status === "signing_order_waiting_verification" ||
    status === "advance_signing_order_waiting_verification"
  );
}

/** Manager checklist before «взять поручение в проверку». */
export function orderReviewChecklist(input: ReviewCheckInput): string[] {
  const lines: string[] = [];
  const order = input.documents.find((doc) => doc.kind === "order");
  lines.push(
    order
      ? `Откройте подписанное поручение «${order.title}».`
      : "Подписанное поручение в списке документов не приложено.",
  );
  const payment = input.documents.find((doc) => doc.kind === "payment");
  if (payment) {
    lines.push(`Платёжный документ «${payment.title}» — сверьте сумму и валюту.`);
  }
  for (const warning of input.amountWarnings ?? []) lines.push(warning);
  lines.push(
    "Кнопка «Взять поручение в проверку» фиксирует очередь. Документы она не проверяет — откройте файлы до нажатия.",
  );
  return lines;
}

/** Concrete checks for the manager before «взять в проверку». Only facts that are on the form. */
export function reviewChecklist(input: ReviewCheckInput): string[] {
  const lines: string[] = [];
  const invoice = input.documents.find((doc) => doc.kind === "invoice");
  const contract = input.documents.find((doc) => doc.kind === "contract");
  lines.push(invoice ? `Откройте инвойс «${invoice.title}».` : "Инвойс в списке документов не приложен.");
  lines.push(
    contract ? `Откройте агентский договор «${contract.title}».` : "Агентский договор в списке документов не приложен.",
  );
  if (!input.hsCode || input.hsCode === "—") lines.push("Код ТН ВЭД не указан.");
  if (input.counterpartyStatus && input.counterpartyStatus !== "approved") {
    const name = input.counterpartyName ? `«${input.counterpartyName}»` : "контрагента";
    lines.push(`Контрагент ${name} не проверен.`);
  }
  for (const warning of input.amountWarnings ?? []) lines.push(warning);
  lines.push(
    "Кнопка фиксирует, что вы взяли заявку. Документы она не проверяет. После неё решение — подтвердить или вернуть.",
  );
  return lines;
}
