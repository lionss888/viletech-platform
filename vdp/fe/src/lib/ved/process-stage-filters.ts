import type { ProcessRoleRow } from "@/lib/api/process-roles";

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
