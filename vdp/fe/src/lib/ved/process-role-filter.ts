import type { ProcessRoleRow } from "@/lib/api/process-roles";

/** Demo/UI action id → capability (mirrors core CapabilityForAction via action-bridge). */
const ACTION_CAPABILITY: Record<string, string> = {
  recognize_complete: "form.recognize",
  accept_form: "form.submit",
  accept_corrections: "form.submit",
  cancel_form: "form.cancel_user",
  upload_order: "user.docs",
  upload_order_advance: "user.docs",
  upload_contract: "user.docs",
  upload_report: "user.docs",
  upload_shipment: "user.docs",
  upload_payments: "user.docs",
  ico_form_start: "org.compliance",
  ico_form_accept: "org.compliance",
  ico_form_reject: "org.compliance",
  ico_form_stop: "org.compliance",
  ico_cancel: "org.compliance",
  eco_form_start: "form.compliance",
  eco_form_accept: "form.compliance",
  eco_form_reject: "form.compliance",
  eco_form_stop: "form.compliance",
  eco_cancel: "form.compliance",
  mgr_assign_agent: "manager.ops",
  mgr_contract_attach: "manager.ops",
  mgr_form_reject: "manager.ops",
  mgr_contract_confirm: "manager.ops",
  mgr_contract_return: "manager.ops",
  mgr_order_generate: "manager.ops",
  mgr_order_attach: "manager.ops",
  mgr_order_start: "manager.ops",
  mgr_order_accept: "manager.ops",
  mgr_order_reject: "manager.ops",
  mgr_order_stop: "manager.ops",
  mgr_payment_received: "manager.payment",
  mgr_payment_start: "manager.payment",
  mgr_assign_provider: "manager.ops",
  mgr_cancel: "manager.ops",
  mgr_report_signing: "manager.ops",
  mgr_report_start: "manager.ops",
  mgr_report_accept: "manager.ops",
  mgr_report_reject: "manager.ops",
  mgr_shipment_waiting: "manager.ops",
  mgr_shipment_start: "manager.ops",
  mgr_shipment_reject: "manager.ops",
  mgr_completed: "manager.ops",
  mgr_refund_init: "manager.ops",
  mgr_refund_cancel: "manager.ops",
  prov_payment_start: "provider.payment",
  prov_attach_proof: "provider.payment",
  prov_payment_sent: "provider.payment",
  prov_payment_return: "provider.payment",
  root_cancel_form: "manager.ops",
};

export function capabilityForUiAction(actionId: string): string | undefined {
  return ACTION_CAPABILITY[actionId];
}

export function roleAllowsUiAction(cfg: ProcessRoleRow | undefined, actionId: string): boolean {
  if (!cfg) return true;
  if (!cfg.enabled || cfg.influence === "none" || cfg.influence === "observer") {
    return actionId === "root_cancel_form" && cfg.role === "root";
  }
  if (cfg.role === "root") return true;
  const cap = capabilityForUiAction(actionId);
  if (!cap) return true;
  return cfg.capabilities.includes(cap);
}

export function findProcessRole(rows: ProcessRoleRow[] | undefined, role: string): ProcessRoleRow | undefined {
  return rows?.find((r) => r.role === role);
}
