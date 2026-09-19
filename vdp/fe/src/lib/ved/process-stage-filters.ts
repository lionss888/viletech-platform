import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { isProcessSlotDisabled } from "@/lib/ved/process-role-filter";
import { SHIPMENT_STAGE, STAGES, STATUS_FILTERS, statusMeta, type StatusMeta } from "@/lib/ved/statuses";
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

/**
 * Lifecycle rail for the current process config.
 * Organization stays its own step. Renames ECO review → «Проверка».
 * Omits «Отгрузка» unless status is already in shipment_* (optional Nest branch).
 */
export function stagesForProcess(
  roles: ProcessRoleRow[] | undefined,
  status?: FormStatus,
): { id: StageId; label: string }[] {
  const includeShipment = status !== undefined && statusMeta(status).stage === "shipment";
  const base = includeShipment ? insertShipmentStage(STAGES) : STAGES;
  if (!roles?.length) return base;
  const ecoOff = isProcessSlotDisabled(roles, "compliance_officer");
  return base
    .map((stage) => {
      if (stage.id === "form_verification" && ecoOff) {
        return { ...stage, label: "Проверка" };
      }
      if (stage.id === "organization_verification") {
        return { ...stage, label: "Организация" };
      }
      return stage;
    });
}

function insertShipmentStage(
  stages: { id: StageId; label: string }[],
): { id: StageId; label: string }[] {
  const completedIdx = stages.findIndex((stage) => stage.id === "completed");
  if (completedIdx < 0) return [...stages, SHIPMENT_STAGE];
  return [...stages.slice(0, completedIdx), SHIPMENT_STAGE, ...stages.slice(completedIdx)];
}

/** Stage shown on the lifecycle rail. Organization stays its own step; a confirmed form is on the contract stage. */
export function displayStageId(status: FormStatus, _roles: ProcessRoleRow[] | undefined): StageId {
  return statusMeta(status).stage;
}

/** VED helper: stageIndexForProcess. */
export function stageIndexForProcess(status: FormStatus, roles: ProcessRoleRow[] | undefined): number {
  const stages = stagesForProcess(roles, status);
  return stages.findIndex((stage) => stage.id === displayStageId(status, roles));
}
