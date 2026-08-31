import { actionsFor } from "./actions";
import type { ActionTone, FormAction, FormStatus, VedRole } from "./types";

export type AppFormAction = {
  id: string;
  label: string;
  tone: ActionTone;
  requiresReason?: boolean;
  requiresMark?: boolean;
  requiresFile?: boolean;
  requiresProvider?: boolean;
  confirm?: string;
  coreAction?: string;
  nestPath?: string;
  fileDocType?: string;
  special?: "assign_provider" | "order_signing";
};

const UI_TO_CORE: Record<string, Omit<AppFormAction, "id" | "label" | "tone">> = {
  accept_form: { coreAction: "submit" },
  accept_corrections: { coreAction: "submit" },
  cancel_form: { coreAction: "cancel" },
  ico_form_start: { coreAction: "ico_start" },
  ico_form_accept: { coreAction: "ico_approve" },
  ico_form_reject: { coreAction: "ico_reject", requiresReason: true, requiresMark: true },
  ico_form_stop: { coreAction: "ico_stop" },
  ico_cancel: { coreAction: "cancel_by_ico", requiresReason: true },
  eco_form_start: { coreAction: "eco_start" },
  eco_form_accept: { coreAction: "eco_accept" },
  eco_form_reject: { coreAction: "eco_reject", requiresReason: true, requiresMark: true },
  eco_form_stop: { coreAction: "eco_stop" },
  eco_cancel: { coreAction: "cancel_by_eco", requiresReason: true },
  mgr_form_reject: { coreAction: "manager_form_reject", requiresReason: true },
  mgr_contract_attach: { requiresFile: true, fileDocType: "contract", nestPath: "contract/attach" },
  mgr_order_generate: { special: "order_signing" },
  mgr_order_attach: { requiresFile: true, fileDocType: "order" },
  mgr_order_start: { coreAction: "order_start" },
  mgr_order_accept: { coreAction: "order_accept" },
  mgr_order_reject: { coreAction: "order_reject", requiresReason: true },
  mgr_order_stop: { coreAction: "order_stop" },
  mgr_order_advance_accept: { coreAction: "advance_accept" },
  mgr_order_advance_reject: { coreAction: "advance_reject", requiresReason: true },
  mgr_payment_received: { coreAction: "payment_received" },
  mgr_assign_provider: { special: "assign_provider", requiresProvider: true },
  mgr_payment_start: { coreAction: "payment_start" },
  mgr_cancel: { coreAction: "cancel_by_manager", requiresReason: true },
  mgr_report_signing: { coreAction: "report_signing" },
  mgr_report_start: { coreAction: "report_start" },
  mgr_report_accept: { coreAction: "report_accept" },
  mgr_report_reject: { coreAction: "report_reject", requiresReason: true },
  mgr_shipment_start: { coreAction: "shipment_start" },
  mgr_completed: { coreAction: "complete" },
  mgr_shipment_reject: { coreAction: "shipment_reject", requiresReason: true },
  prov_attach_proof: { requiresFile: true, fileDocType: "payment" },
  prov_payment_sent: { coreAction: "provider_sent" },
  prov_payment_return: { coreAction: "provider_return", requiresReason: true },
  prov_payment_start: { coreAction: "provider_start" },
  upload_contract: { requiresFile: true, fileDocType: "contract", coreAction: "user_upload_contract" },
  upload_order: { requiresFile: true, fileDocType: "order", coreAction: "user_upload_order" },
  upload_order_advance: { requiresFile: true, fileDocType: "order", coreAction: "advance_user_upload" },
  upload_payments: { requiresFile: true, fileDocType: "payment" },
  upload_report: { requiresFile: true, fileDocType: "report", coreAction: "report_upload" },
  upload_shipment: { requiresFile: true, fileDocType: "shipment", coreAction: "shipment_upload" },
  root_cancel_form: { coreAction: "cancel_by_manager", requiresReason: true },
};

export function appActionsFor(role: VedRole, status: FormStatus): AppFormAction[] {
  return actionsFor(role, status).map((action) => {
    const mapped = UI_TO_CORE[action.id] ?? { coreAction: action.id };
    return {
      id: action.id,
      label: action.label,
      tone: action.tone,
      requiresReason: action.requiresReason ?? mapped.requiresReason,
      requiresMark: action.requiresMark ?? mapped.requiresMark,
      requiresFile: action.requiresFile ?? mapped.requiresFile,
      confirm: action.confirm,
      coreAction: mapped.coreAction,
      nestPath: mapped.nestPath,
      fileDocType: mapped.fileDocType,
      special: mapped.special,
      requiresProvider: mapped.requiresProvider,
    };
  });
}

export function resolveCoreAction(uiActionId: string): string | undefined {
  return UI_TO_CORE[uiActionId]?.coreAction;
}

export function demoActionFromApp(action: AppFormAction): FormAction {
  return {
    id: action.id,
    label: action.label,
    tone: action.tone,
    requiresReason: action.requiresReason,
    requiresMark: action.requiresMark,
    requiresFile: action.requiresFile,
    confirm: action.confirm,
    nextStatus: "draft",
  };
}
