import type { StatusMeta } from "@/lib/ved/statuses";

/** Form statuses where POG PDF may still be forming before client signature. */
const POG_FORMATION_STATUSES = new Set(["signing_order", "advance_signing_order"]);

/**
 * True when the form lifecycle status can wait on POG generation before
 * «отправлено на подпись» is honest.
 */
export function isPogFormationStatus(formStatus: string): boolean {
  return POG_FORMATION_STATUSES.has(formStatus);
}

/**
 * Overlay badge/copy from `status` + `pogStatus` without renaming domain STATUS_META.
 * Idle/pending must not look like the PDF is already out for signature.
 */
export function overlayStatusMetaForPog(
  meta: StatusMeta,
  formStatus: string,
  pogStatus?: string | null,
): StatusMeta {
  if (!isPogFormationStatus(formStatus)) return meta;
  const pog = (pogStatus ?? "idle").trim() || "idle";
  if (pog === "pending") {
    return {
      ...meta,
      label: "Формируем PDF поручения…",
      short: "Формируем поручение",
      tone: "work",
    };
  }
  if (pog === "idle") {
    return {
      ...meta,
      label: "Ожидает формирования поручения",
      short: "Ожидает формирования",
      tone: "wait",
    };
  }
  return meta;
}
