import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { actionsFor } from "@/lib/ved/actions";
import { filterAgencyContractActions } from "@/lib/ved/agency-contract-ux";
import {
  hidesFormAcceptedActionForDirection,
  hidesPaymentStartForImportAdvance,
  hidesTreasurerConfirmOnProcessingForImport,
  withoutAssignedProviderAction,
} from "@/lib/ved/manager-payment";
import type { FormAction, FormCondition, FormDirection, FormStatus, PaymentForm, VedRole } from "@/lib/ved/types";

/** Minimal form projection for CTA filtering (list rows, hints, ActionPanel). */
export type EffectiveActionsFormCtx = {
  status: FormStatus;
  direction?: FormDirection;
  condition?: FormCondition;
  paymentMethod?: string;
  contractId?: string;
  providerId?: string;
  orgHasAcceptedAgency?: boolean;
};

/** Builds ctx from a payment form row or partial API projection. */
export function effectiveActionsFormCtx(
  form: Pick<
    PaymentForm,
    "status" | "direction" | "condition" | "paymentMethod" | "contractId" | "providerId"
  >,
): EffectiveActionsFormCtx {
  return {
    status: form.status,
    direction: form.direction,
    condition: form.condition,
    paymentMethod: form.paymentMethod,
    contractId: form.contractId,
    providerId: form.providerId,
  };
}

/** Role actions after agency, import-advance treasurer gates, and assigned-provider trim. */
export function effectiveActionsFor(
  role: VedRole,
  ctx: EffectiveActionsFormCtx,
  processRoles?: ProcessRoleRow[],
): FormAction[] {
  const raw = filterAgencyContractActions(actionsFor(role, ctx.status, processRoles), {
    status: ctx.status,
    contractId: ctx.contractId,
    orgHasAcceptedAgency: ctx.orgHasAcceptedAgency,
  });
  const filtered = raw.filter(
    (action) =>
      !hidesPaymentStartForImportAdvance({
        status: ctx.status,
        actionId: action.id,
        condition: ctx.condition,
        direction: ctx.direction,
        paymentMethod: ctx.paymentMethod,
      }) &&
      !hidesTreasurerConfirmOnProcessingForImport({
        status: ctx.status,
        actionId: action.id,
        direction: ctx.direction,
        paymentMethod: ctx.paymentMethod,
      }) &&
      !hidesFormAcceptedActionForDirection({
        status: ctx.status,
        actionId: action.id,
        direction: ctx.direction,
      }),
  );
  return withoutAssignedProviderAction(filtered, ctx.providerId);
}
