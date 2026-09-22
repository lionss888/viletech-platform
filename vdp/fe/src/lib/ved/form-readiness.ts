import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { isImportAdvanceCoverageGate } from "@/lib/ved/manager-payment";
import { effectiveActionsFor, effectiveActionsFormCtx } from "@/lib/ved/effective-actions";
import { isOrderWaitingTake, isWaitingTakeStatus } from "@/lib/ved/review-checklist";
import type { PaymentForm, VedRole } from "@/lib/ved/types";

export type ReadinessChip = {
  id: string;
  label: string;
  tone: "wait" | "work" | "return" | "neutral";
};

/** Compact readiness hints for registry rows (manager / CO queues). */
export function readinessChips(
  form: PaymentForm,
  role: VedRole,
  processRoles?: ProcessRoleRow[],
): ReadinessChip[] {
  const chips: ReadinessChip[] = [];
  const hasInvoice = form.documents.some((doc) => doc.kind === "invoice");
  if (!hasInvoice && !form.noDocuments && form.status !== "creating" && form.status !== "draft") {
    chips.push({ id: "invoice", label: "Нужен инвойс", tone: "return" });
  }
  if (isWaitingTakeStatus(form.status)) {
    chips.push({ id: "take-form", label: "Очередь проверки", tone: "work" });
  }
  if (isOrderWaitingTake(form.status)) {
    chips.push({ id: "take-order", label: "Очередь поручения", tone: "work" });
  }
  if (
    form.status === "payment_received" &&
    isImportAdvanceCoverageGate({ condition: form.condition, direction: form.direction, paymentMethod: form.paymentMethod })
  ) {
    chips.push({ id: "treasurer", label: "Ждём казначея", tone: "wait" });
  }
  if (form.pogStatus === "pending") {
    chips.push({ id: "pog", label: "Формируем поручение", tone: "wait" });
  }
  if (form.pogStatus === "failed") {
    chips.push({ id: "pog-fail", label: "Ошибка генерации PDF", tone: "return" });
  }
  const ctx = effectiveActionsFormCtx(form);
  if (effectiveActionsFor(role, ctx, processRoles).length > 0) {
    chips.push({ id: "mine", label: "Моё действие", tone: "work" });
  }
  return chips;
}
