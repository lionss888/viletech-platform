import { attachDocApi, uploadFileApi } from "@/lib/api/files";
import { assignProviderApi, nestPutApi, transitionFormApi } from "@/lib/api/forms";
import type { CoreForm } from "@/lib/api/types";
import type { AppFormAction } from "./app-actions";
import { normalizeFormId } from "./form-mapper";
import type { VedRole } from "./types";

export type BridgeExtras = {
  comment?: string;
  file?: File;
  providerId?: string;
};

const NEST_ROLE: Partial<Record<VedRole, string>> = {
  user: "site",
  internal_compliance_officer: "ico",
  compliance_officer: "eco",
  manager: "manager",
  provider: "provider",
  root: "admin",
};

const DEFAULT_PROVIDER_ID = "55555555-5555-5555-5555-555555555555";

export async function executeBridgeAction(
  token: string,
  role: VedRole,
  formId: string,
  action: AppFormAction,
  extras: BridgeExtras = {},
): Promise<CoreForm> {
  const id = normalizeFormId(formId);
  if (action.special === "assign_provider") {
    return assignProviderApi(token, id, extras.providerId || DEFAULT_PROVIDER_ID, true);
  }
  if (action.special === "order_signing") {
    return nestPutApi(token, "manager", id, "order/signing");
  }
  if (action.requiresFile && extras.file) {
    const uploaded = await uploadFileApi(token, extras.file);
    if (action.fileDocType) {
      await attachDocApi(token, id, uploaded.id, action.fileDocType);
    }
    if (action.coreAction) {
      return transitionFormApi(token, id, action.coreAction, extras.comment);
    }
    return transitionFormApi(token, id, "payment_received", extras.comment);
  }
  if (action.nestPath) {
    const nestRole = NEST_ROLE[role] || "site";
    return nestPutApi(token, nestRole, id, action.nestPath);
  }
  if (action.coreAction) {
    return transitionFormApi(token, id, action.coreAction, extras.comment);
  }
  throw new Error(`action ${action.id} is not mapped to core API`);
}

export function nestRoleFor(role: VedRole): string {
  return NEST_ROLE[role] || "site";
}
