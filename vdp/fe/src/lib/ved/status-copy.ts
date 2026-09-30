import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { isImportAdvanceCoverageGate } from "@/lib/ved/manager-payment";
import { findProcessRole, treasurerOpsRecipient } from "@/lib/ved/process-role-filter";
import type { VedRole } from "@/lib/ved/types";

/** Treasurer slot off with skip disposition (manager receives CapTreasurerOps). */
export function isTreasurerSkipDisposition(rows?: ProcessRoleRow[]): boolean {
  const treas = findProcessRole(rows, "treasurer");
  if (!treas || treas.enabled) return false;
  return treas.disable_mode === "skip";
}

/**
 * Guided "awaiting treasurer" banner on import-advance payment_received.
 * Hidden when skip/handoff moved CapTreasurerOps off the treasurer slot.
 */
export function showAwaitsTreasurerBanner(input: {
  status: string;
  role: string;
  condition?: string;
  direction?: string;
  paymentMethod?: string;
  processRoles?: ProcessRoleRow[];
}): boolean {
  if (input.status !== "payment_received") return false;
  if (input.role !== "manager" && input.role !== "root") return false;
  if (
    !isImportAdvanceCoverageGate({
      condition: input.condition,
      direction: input.direction,
      paymentMethod: input.paymentMethod,
    })
  ) {
    return false;
  }
  if (treasurerOpsRecipient(input.processRoles)) return false;
  return true;
}

/**
 * Copy for import-advance coverage wait. When treasurer is skipped, never mention казначей.
 */
export function getImportAdvanceCoverageCopy(input: {
  role: VedRole | string;
  processRoles?: ProcessRoleRow[];
}): string {
  if (isTreasurerSkipDisposition(input.processRoles) || treasurerOpsRecipient(input.processRoles)) {
    if (input.role === "manager" || input.role === "root") {
      return "Подтвердите поступление средств";
    }
    return "Ожидается подтверждение поступления средств";
  }
  return "Ожидается подтверждение казначея";
}

/** Registry chip label for import-advance coverage wait. */
export function importAdvanceCoverageChipLabel(rows?: ProcessRoleRow[]): string {
  if (isTreasurerSkipDisposition(rows) || treasurerOpsRecipient(rows)) {
    return "Нужно подтвердить поступление";
  }
  return "Ждём казначея";
}
