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
  continuityManagerFormApprove: "continuity_manager_form_approve",
  managerRejectToCorrections: "manager_reject_to_corrections",
  userResubmitAfterReject: "user_resubmit_after_reject",
  providerReturnToManager: "provider_return_to_manager",
  extractionConfirmUpdatesAmount: "extraction_confirm_updates_amount",
  managerSetsDealRate: "manager_sets_deal_rate",
} as const;

export type ScenarioId = (typeof SCENARIO_IDS)[keyof typeof SCENARIO_IDS];

/** Playwright specs that cover UI-tagged or UI-spot catalog entries. */
export const UI_SCENARIO_SPECS: Record<string, string> = {
  [SCENARIO_IDS.happyPathToCompleted]:
    "e2e/happy-path.spec.ts e2e/completed-journey.spec.ts e2e/pilot-matrix-full-ladder.spec.ts",
  [SCENARIO_IDS.ecoRejectResubmit]: "e2e/reject-path.spec.ts e2e/pilot-matrix-full-ladder.spec.ts",
  [SCENARIO_IDS.icoOrgPendingApprove]: "e2e/ico-org.spec.ts",
  [SCENARIO_IDS.managerPaymentAssignProvider]: "e2e/manager-payment.spec.ts e2e/pilot-matrix-full-ladder.spec.ts",
  [SCENARIO_IDS.providerPaymentNoPii]: "e2e/provider-acl.spec.ts e2e/pilot-matrix-full-ladder.spec.ts",
  [SCENARIO_IDS.bankChannelBadge]: "e2e/bank-badge.spec.ts",
  [SCENARIO_IDS.rootCancel]: "e2e/pilot-form-flow.spec.ts",
  [SCENARIO_IDS.managerHidesDrafts]: "e2e/manager-hides-drafts.spec.ts",
  [SCENARIO_IDS.docPreviewVisible]: "e2e/api-core-ux.spec.ts e2e/pilot-form-flow.spec.ts",
  [SCENARIO_IDS.continuityManagerFormApprove]: "e2e/happy-path.spec.ts e2e/pilot-matrix-full-ladder.spec.ts",
  [SCENARIO_IDS.managerRejectToCorrections]: "e2e/pilot-matrix-full-ladder.spec.ts e2e/reject-path.spec.ts",
  [SCENARIO_IDS.userResubmitAfterReject]: "e2e/pilot-matrix-full-ladder.spec.ts e2e/reject-path.spec.ts",
  [SCENARIO_IDS.providerReturnToManager]: "e2e/provider-return.spec.ts",
  [SCENARIO_IDS.extractionConfirmUpdatesAmount]: "e2e/form-ux-deadends.spec.ts",
  [SCENARIO_IDS.managerSetsDealRate]: "e2e/manager-rate.spec.ts",
};
