import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { isProcessSlotDisabled } from "@/lib/ved/process-role-filter";
import { STAGES, STATUS_FILTERS, statusMeta, type StatusMeta } from "@/lib/ved/statuses";
import type { FormStatus, StageId } from "@/lib/ved/types";

const COMPLIANCE_ROLES = ["internal_compliance_officer", "compliance_officer"] as const;

/** True when at least one compliance process role is enabled as an actor. */
export function isComplianceProcessActive(roles: ProcessRoleRow[] | undefined): boolean {
  if (!roles?.length) return true;
  return roles.some(
    (row) =>
      (COMPLIANCE_ROLES as readonly string[]).includes(row.role) &&
      row.enabled &&
      row.influence === "actor",
  );
}

/** Registry summary card / filter label for org+form verification stages. */
export function verificationQueueLabel(roles: ProcessRoleRow[] | undefined): string {
  return isComplianceProcessActive(roles) ? "На комплаенсе" : "На проверке";
}

/** Status dropdown options — rename «На комплаенсе» when ICO/ECO slots are off. */
export function statusFiltersForProcess(
  roles: ProcessRoleRow[] | undefined,
): typeof STATUS_FILTERS {
  if (isComplianceProcessActive(roles)) return STATUS_FILTERS;
  return STATUS_FILTERS.map((filter) =>
    filter.value === "compliance" ? { ...filter, label: "На проверке" } : filter,
  );
}

const CONTINUITY_STATUS_LABELS: Partial<Record<string, Pick<StatusMeta, "label" | "short">>> = {
  organization_waiting_verification: {
    label: "Ожидает проверки организации менеджером",
    short: "У менеджера",
  },
  organization_verification: {
    label: "Менеджер проверяет организацию",
    short: "Проверка орг.",
  },
  form_waiting_verification: {
    label: "Ожидает проверки менеджером",
    short: "У менеджера",
  },
  form_verification: {
    label: "Менеджер проверяет заявку",
    short: "Проверка",
  },
  form_waiting_corrections: {
    label: "Возвращена на доработку",
    short: "Доработка",
  },
  form_accepted: {
    label: "Заявка подтверждена менеджером",
    short: "Подтверждена",
  },
};

/** Manager-facing shorts for queue (viewer is the actor, not «у менеджера»). */
const MANAGER_VIEWER_LABELS: Partial<Record<string, Pick<StatusMeta, "label" | "short">>> = {
  form_waiting_verification: {
    label: "Новая заявка",
    short: "Новая заявка",
  },
  form_verification: {
    label: "На рассмотрении",
    short: "Рассмотрение",
  },
  organization_waiting_verification: {
    label: "Новая заявка (организация)",
    short: "Новая заявка",
  },
  organization_verification: {
    label: "Рассмотрение организации",
    short: "Рассмотрение",
  },
};

/**
 * Status copy for the card/badge. When ICO/ECO slots are off (U→M→P), domain still uses
 * form_verification / organization_* codes — UI must not say «комплаенс».
 * Optional viewerRole remaps manager queue shorts («Новая заявка» / «Рассмотрение»).
 */
export function statusMetaForProcess(
  status: FormStatus,
  roles: ProcessRoleRow[] | undefined,
  viewerRole?: string,
): StatusMeta {
  const base = statusMeta(status);
  if (!roles?.length) return base;
  const icoOff = isProcessSlotDisabled(roles, "internal_compliance_officer");
  const ecoOff = isProcessSlotDisabled(roles, "compliance_officer");
  const isOrg = status.startsWith("organization_");
  const isFormReview =
    status === "form_waiting_verification" ||
    status === "form_verification" ||
    status === "form_waiting_corrections" ||
    status === "form_accepted";
  if (isOrg && !icoOff) return base;
  if (isFormReview && !ecoOff) return base;
  if (!isOrg && !isFormReview) return base;
  const overlay = CONTINUITY_STATUS_LABELS[status];
  let meta: StatusMeta = overlay ? { ...base, ...overlay } : base;
  if (viewerRole === "manager") {
    const managerOverlay = MANAGER_VIEWER_LABELS[status];
    if (managerOverlay) meta = { ...meta, ...managerOverlay };
  }
  return meta;
}

/** Lifecycle rail for the current process config (hide disabled ICO stage; rename ECO). */
export function stagesForProcess(
  roles: ProcessRoleRow[] | undefined,
): { id: StageId; label: string }[] {
  if (!roles?.length) return STAGES;
  const icoOff = isProcessSlotDisabled(roles, "internal_compliance_officer");
  const ecoOff = isProcessSlotDisabled(roles, "compliance_officer");
  return STAGES.filter((stage) => {
    if (stage.id === "organization_verification" && icoOff) return false;
    return true;
  }).map((stage) => {
    if (stage.id === "form_verification" && ecoOff) {
      return { ...stage, label: "Проверка" };
    }
    return stage;
  });
}

/** Stage id used by the stepper after collapsing disabled ICO into «Проверка». */
export function displayStageId(status: FormStatus, roles: ProcessRoleRow[] | undefined): StageId {
  const stage = statusMeta(status).stage;
  if (!roles?.length) return stage;
  if (
    stage === "organization_verification" &&
    isProcessSlotDisabled(roles, "internal_compliance_officer")
  ) {
    return "form_verification";
  }
  return stage;
}

/** VED helper: stageIndexForProcess. */
export function stageIndexForProcess(status: FormStatus, roles: ProcessRoleRow[] | undefined): number {
  const stages = stagesForProcess(roles);
  return stages.findIndex((stage) => stage.id === displayStageId(status, roles));
}
