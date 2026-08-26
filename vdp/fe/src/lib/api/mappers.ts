import type { CoreForm } from "./forms";
import type { FormDirection, FormKind, PaymentForm } from "@/lib/ved/types";

function parseAmountMinor(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

function mapDirection(value: string): FormDirection {
  return value === "export" ? "export" : "import";
}

function mapKind(value: string): FormKind {
  return value === "service" ? "service" : "good";
}

/** Maps core Form DTO to UI PaymentForm projection. */
export function mapCoreFormToPaymentForm(form: CoreForm, ownerName = "—"): PaymentForm {
  const shortId = form.id.length > 8 ? form.id.slice(0, 8) : form.id;
  return {
    id: form.id,
    number: `ВЭД-${shortId}`,
    status: form.status,
    direction: mapDirection(form.direction),
    kind: mapKind(form.kind),
    condition: "advance",
    amountMinor: parseAmountMinor(form.invoice_amount),
    currency: form.currency || "USD",
    organizationId: form.organization_id || "—",
    counterpartyId: form.counterparty_id || "—",
    hsCode: "—",
    invoiceNumber: form.contract_number || "—",
    ownerName,
    managerName: form.manager_id || undefined,
    providerName: form.provider_id || undefined,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    documents: [],
    timeline: [],
  };
}

export function nextStepHint(status: string): string {
  if (status === "draft" || status === "creating") return "Отправьте заявку на проверку.";
  if (status.includes("waiting_verification") || status.includes("_verification")) {
    return "Ожидайте решения проверяющего или возьмите в работу, если это ваша роль.";
  }
  if (status.includes("corrections") || status.includes("correction")) {
    return "Исправьте замечания и отправьте повторно.";
  }
  if (status.startsWith("payment")) return "Контролируйте исполнение платежа.";
  if (status.startsWith("report") || status.startsWith("shipment")) return "Закройте документы и отгрузку.";
  if (status === "completed") return "Заявка закрыта.";
  if (status.startsWith("canceled")) return "Заявка отменена.";
  return "Смотрите доступные действия справа.";
}
