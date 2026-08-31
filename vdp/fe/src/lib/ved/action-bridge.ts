import { coreActionById } from "./app-actions";

/** Demo action id → core use-case action id (forms/{id}/actions/{action}). */
const DEMO_TO_CORE: Record<string, string> = {
  recognize_complete: "recognize_complete",
  accept_form: "submit",
  accept_corrections: "submit",
  cancel_form: "cancel",
  upload_order: "user_upload_order",
  upload_order_advance: "advance_user_upload",
  upload_report: "report_upload",
  upload_shipment: "shipment_upload",
  ico_form_start: "ico_start",
  ico_form_accept: "ico_approve",
  ico_form_reject: "ico_reject",
  ico_form_stop: "ico_stop",
  ico_cancel: "cancel_by_ico",
  eco_form_start: "eco_start",
  eco_form_accept: "eco_accept",
  eco_form_reject: "eco_reject",
  eco_form_stop: "eco_stop",
  eco_cancel: "cancel_by_eco",
  mgr_form_reject: "manager_form_reject",
  mgr_order_generate: "manager_send_order",
  mgr_order_attach: "order_signing",
  mgr_order_start: "order_start",
  mgr_order_accept: "order_accept",
  mgr_order_reject: "order_reject",
  mgr_order_stop: "order_stop",
  mgr_order_advance_start: "advance_start",
  mgr_order_advance_stop: "advance_stop",
  mgr_order_advance_accept: "advance_accept",
  mgr_order_advance_reject: "advance_reject",
  mgr_advance_signing: "advance_signing",
  mgr_payment_received: "payment_received",
  mgr_payment_start: "payment_start",
  mgr_cancel: "cancel_by_manager",
  mgr_report_signing: "report_signing",
  mgr_report_start: "report_start",
  mgr_report_accept: "report_accept",
  mgr_report_reject: "report_reject",
  mgr_shipment_waiting: "shipment_waiting",
  mgr_shipment_start: "shipment_start",
  mgr_completed: "complete",
  mgr_shipment_reject: "shipment_reject",
  mgr_refund_cancel: "refund_cancel",
  prov_attach_proof: "provider_sent",
  prov_payment_sent: "provider_sent",
  prov_payment_return: "provider_return",
  prov_payment_start: "provider_start",
  root_cancel_form: "cancel_by_manager",
  order_signing: "order_signing",
  order_start: "order_start",
  order_accept: "order_accept",
  order_reject: "order_reject",
  payment_received: "payment_received",
  payment_start: "payment_start",
  report_signing: "report_signing",
  report_start: "report_start",
  report_accept: "report_accept",
  shipment_start: "shipment_start",
  complete: "complete",
  provider_start: "provider_start",
  provider_sent: "provider_sent",
  provider_return: "provider_return",
};

export type ActionSideEffect =
  | { kind: "transition"; coreAction: string }
  | { kind: "assign_provider" }
  | { kind: "assign_agent" }
  | { kind: "assign_deadline" }
  | { kind: "contract_attach" }
  | { kind: "contract_resolve" }
  | { kind: "contract_return" }
  | { kind: "refund_init" }
  | { kind: "refund_start" }
  | { kind: "refund_stop" }
  | { kind: "refund_sent" }
  | { kind: "refund_cancel" }
  | { kind: "refund_file" }
  | { kind: "set_confirmation" }
  | { kind: "file_then_transition"; coreAction: string; docKind: string }
  | { kind: "file_attach"; docKind: string };

const FILE_THEN_TRANSITION: Record<string, { coreAction: string; docKind: string }> = {
  upload_contract: { coreAction: "user_upload_contract", docKind: "contract" },
  upload_order: { coreAction: "user_upload_order", docKind: "order" },
  upload_order_advance: { coreAction: "advance_user_upload", docKind: "advance_order" },
  upload_report: { coreAction: "report_upload", docKind: "report" },
  upload_shipment: { coreAction: "shipment_upload", docKind: "shipment" },
  mgr_order_attach: { coreAction: "order_signing", docKind: "order" },
  mgr_refund_file: { coreAction: "refund_sent", docKind: "refund_proof" },
};

/** User payment proof: attach file only; manager confirms payment_received (Nest MetaPayments). */
const FILE_ATTACH_ONLY: Record<string, string> = {
  upload_payments: "payment",
};

const SIDE_EFFECT_ONLY = new Set([
  "mgr_assign_provider",
  "mgr_assign_agent",
  "mgr_assign_deadline",
  "mgr_contract_attach",
  "mgr_contract_confirm",
  "mgr_contract_return",
  "mgr_refund_init",
  "mgr_refund_start",
  "mgr_refund_stop",
  "mgr_refund_sent",
  "mgr_refund_cancel",
  "prov_attach_proof",
  "prov_set_confirmation",
]);

/** Resolves demo UI action to core transition id. */
export function demoActionToCore(actionId: string): string | undefined {
  return DEMO_TO_CORE[actionId] ?? coreActionById(actionId);
}

/** Full resolution including side-effect routes (provider assign, file upload). */
export function resolveDemoAction(actionId: string): ActionSideEffect | undefined {
  if (SIDE_EFFECT_ONLY.has(actionId)) {
    switch (actionId) {
      case "mgr_assign_provider":
        return { kind: "assign_provider" };
      case "mgr_assign_agent":
        return { kind: "assign_agent" };
      case "mgr_assign_deadline":
        return { kind: "assign_deadline" };
      case "mgr_contract_attach":
        return { kind: "contract_attach" };
      case "mgr_contract_confirm":
        return { kind: "contract_resolve" };
      case "mgr_contract_return":
        return { kind: "contract_return" };
      case "mgr_refund_init":
        return { kind: "refund_init" };
      case "mgr_refund_start":
        return { kind: "refund_start" };
      case "mgr_refund_stop":
        return { kind: "refund_stop" };
      case "mgr_refund_sent":
        return { kind: "refund_sent" };
      case "mgr_refund_cancel":
        return { kind: "refund_cancel" };
      case "prov_set_confirmation":
      case "prov_attach_proof":
        return { kind: "set_confirmation" };
      default:
        return undefined;
    }
  }
  const fileAttach = FILE_ATTACH_ONLY[actionId];
  if (fileAttach) {
    return { kind: "file_attach", docKind: fileAttach };
  }
  const fileFlow = FILE_THEN_TRANSITION[actionId];
  if (fileFlow) {
    if (actionId === "mgr_refund_file") {
      return { kind: "refund_file" };
    }
    return { kind: "file_then_transition", coreAction: fileFlow.coreAction, docKind: fileFlow.docKind };
  }
  const coreAction = demoActionToCore(actionId);
  if (!coreAction) return undefined;
  return { kind: "transition", coreAction };
}

/** All demo action ids from actions.ts matrix (for parity tests). */
export const ALL_DEMO_ACTION_IDS = [
  "recognize_complete",
  "accept_form",
  "cancel_form",
  "accept_corrections",
  "upload_contract",
  "upload_order",
  "upload_order_advance",
  "upload_payments",
  "upload_report",
  "upload_shipment",
  "ico_form_start",
  "ico_form_accept",
  "ico_form_reject",
  "ico_form_stop",
  "ico_cancel",
  "eco_form_start",
  "eco_form_accept",
  "eco_form_reject",
  "eco_form_stop",
  "eco_cancel",
  "mgr_assign_agent",
  "mgr_contract_attach",
  "mgr_contract_confirm",
  "mgr_contract_return",
  "mgr_form_reject",
  "mgr_order_generate",
  "mgr_order_attach",
  "mgr_order_start",
  "mgr_order_accept",
  "mgr_order_reject",
  "mgr_order_stop",
  "mgr_advance_signing",
  "mgr_order_advance_start",
  "mgr_order_advance_accept",
  "mgr_order_advance_reject",
  "mgr_order_advance_stop",
  "mgr_payment_received",
  "mgr_assign_provider",
  "mgr_assign_deadline",
  "mgr_payment_start",
  "mgr_refund_init",
  "mgr_refund_start",
  "mgr_refund_stop",
  "mgr_refund_file",
  "mgr_refund_sent",
  "mgr_refund_cancel",
  "mgr_cancel",
  "mgr_report_signing",
  "mgr_report_start",
  "mgr_report_accept",
  "mgr_report_reject",
  "mgr_shipment_waiting",
  "mgr_shipment_start",
  "mgr_completed",
  "mgr_shipment_reject",
  "prov_attach_proof",
  "prov_set_confirmation",
  "prov_payment_sent",
  "prov_payment_return",
  "prov_payment_start",
  "root_cancel_form",
] as const;
