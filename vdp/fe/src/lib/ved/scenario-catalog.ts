/**
 * Shared scenario catalog IDs — mirror of vdp/core/internal/scenarioverify.
 * Do not invent parallel step truth here; API runner owns mutating logic.
 */
export const SCENARIO_IDS = {
  happyPathToCompleted: "happy_path_to_completed",
  ecoRejectResubmit: "eco_reject_resubmit",
  icoOrgPendingApprove: "ico_org_pending_approve",
  managerPaymentAssignProvider: "manager_payment_assign_provider",
  providerPaymentNoPii: "provider_payment_no_pii",
  bankChannelBadge: "bank_channel_badge",
  rootCancel: "root_cancel",
  refundSmoke: "refund_smoke",
  managerHidesDrafts: "manager_hides_drafts",
  docPreviewVisible: "doc_preview_visible",
  healthCore: "health_core",
} as const;

export type ScenarioId = (typeof SCENARIO_IDS)[keyof typeof SCENARIO_IDS];

/** Playwright specs that cover UI-tagged catalog entries. */
export const UI_SCENARIO_SPECS: Record<string, string> = {
  [SCENARIO_IDS.happyPathToCompleted]: "e2e/happy-path.spec.ts e2e/completed-journey.spec.ts",
  [SCENARIO_IDS.ecoRejectResubmit]: "e2e/reject-path.spec.ts",
  [SCENARIO_IDS.icoOrgPendingApprove]: "e2e/ico-org.spec.ts",
  [SCENARIO_IDS.managerPaymentAssignProvider]: "e2e/manager-payment.spec.ts",
  [SCENARIO_IDS.providerPaymentNoPii]: "e2e/provider-acl.spec.ts",
  [SCENARIO_IDS.bankChannelBadge]: "e2e/bank-badge.spec.ts",
  [SCENARIO_IDS.managerHidesDrafts]: "e2e/manager-hides-drafts.spec.ts",
};
