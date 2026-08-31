import { describe, expect, it } from "vitest";

import { resolveDemoAction } from "./action-bridge";
import { actionsFor } from "./actions";

/** RD10: one logical form id — UI CTA ids per role phase (login session switches). */
export type IntegrationJourneyStep = {
  rd: string;
  role: Parameters<typeof actionsFor>[0];
  status: Parameters<typeof actionsFor>[1];
  actionId: string;
  /** Expected bridge kind or core action substring */
  bridge: "transition" | "side_effect" | "file";
  coreHint: string;
};

export const INTEGRATION_JOURNEY: IntegrationJourneyStep[] = [
  { rd: "RD1", role: "user", status: "draft", actionId: "accept_form", bridge: "transition", coreHint: "submit" },
  { rd: "RD2", role: "internal_compliance_officer", status: "organization_waiting_verification", actionId: "ico_form_start", bridge: "transition", coreHint: "ico_start" },
  { rd: "RD2", role: "internal_compliance_officer", status: "organization_verification", actionId: "ico_form_accept", bridge: "transition", coreHint: "ico_approve" },
  { rd: "RD3", role: "compliance_officer", status: "form_waiting_verification", actionId: "eco_form_start", bridge: "transition", coreHint: "eco_start" },
  { rd: "RD3", role: "compliance_officer", status: "form_verification", actionId: "eco_form_accept", bridge: "transition", coreHint: "eco_accept" },
  { rd: "RD4", role: "manager", status: "form_accepted", actionId: "mgr_assign_agent", bridge: "side_effect", coreHint: "assign_agent" },
  { rd: "RD4", role: "manager", status: "form_accepted", actionId: "mgr_contract_attach", bridge: "side_effect", coreHint: "contract_attach" },
  { rd: "RD4", role: "manager", status: "signing_order_waiting_verification", actionId: "mgr_order_start", bridge: "transition", coreHint: "order_start" },
  { rd: "RD4", role: "manager", status: "signing_order_verification", actionId: "mgr_order_accept", bridge: "transition", coreHint: "order_accept" },
  { rd: "RD5", role: "manager", status: "signing_order_accepted", actionId: "mgr_payment_received", bridge: "transition", coreHint: "payment_received" },
  { rd: "RD5", role: "manager", status: "payment_received", actionId: "mgr_assign_provider", bridge: "side_effect", coreHint: "assign_provider" },
  { rd: "RD5", role: "manager", status: "payment_received", actionId: "mgr_payment_start", bridge: "transition", coreHint: "payment_start" },
  { rd: "RD7", role: "provider", status: "payment_received", actionId: "prov_payment_start", bridge: "transition", coreHint: "provider_start" },
  { rd: "RD7", role: "provider", status: "payment_processing", actionId: "prov_payment_sent", bridge: "transition", coreHint: "provider_sent" },
  { rd: "RD6", role: "manager", status: "payment_sent", actionId: "mgr_report_signing", bridge: "transition", coreHint: "report_signing" },
  { rd: "RD6", role: "user", status: "report_waiting", actionId: "upload_report", bridge: "file", coreHint: "report_upload" },
  { rd: "RD6", role: "manager", status: "report_waiting_verification", actionId: "mgr_report_start", bridge: "transition", coreHint: "report_start" },
  { rd: "RD6", role: "manager", status: "report_verification", actionId: "mgr_report_accept", bridge: "transition", coreHint: "report_accept" },
  { rd: "RD6", role: "manager", status: "report_accepted", actionId: "mgr_shipment_waiting", bridge: "transition", coreHint: "shipment_waiting" },
  { rd: "RD6", role: "user", status: "shipment_waiting", actionId: "upload_shipment", bridge: "file", coreHint: "shipment_upload" },
  { rd: "RD6", role: "manager", status: "shipment_verification", actionId: "mgr_completed", bridge: "transition", coreHint: "complete" },
  { rd: "RD8", role: "root", status: "draft", actionId: "root_cancel_form", bridge: "transition", coreHint: "cancel_by_manager" },
];

describe("RD10 integration journey (UI CTA matrix)", () => {
  it("exposes every journey step on the role×status matrix", () => {
    const missing: string[] = [];
    for (const step of INTEGRATION_JOURNEY) {
      const ids = actionsFor(step.role, step.status).map((a) => a.id);
      if (!ids.includes(step.actionId)) {
        missing.push(`${step.rd} ${step.role}@${step.status} → ${step.actionId}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("bridges every journey CTA to core or side effect", () => {
    const broken: string[] = [];
    for (const step of INTEGRATION_JOURNEY) {
      const resolved = resolveDemoAction(step.actionId);
      if (!resolved) {
        broken.push(`${step.actionId}: unresolved`);
        continue;
      }
      if (step.bridge === "side_effect" && resolved.kind !== step.coreHint) {
        broken.push(`${step.actionId}: want kind=${step.coreHint} got ${resolved.kind}`);
      }
      if (step.bridge === "transition" && resolved.kind === "transition" && resolved.coreAction !== step.coreHint) {
        broken.push(`${step.actionId}: want ${step.coreHint} got ${resolved.coreAction}`);
      }
      if (step.bridge === "file" && resolved.kind !== "file_then_transition") {
        broken.push(`${step.actionId}: want file_then_transition got ${resolved.kind}`);
      }
    }
    expect(broken, broken.join("\n")).toEqual([]);
  });

  it("covers RD1→RD6 linear phases without gaps", () => {
    const phases = [...new Set(INTEGRATION_JOURNEY.map((s) => s.rd))];
    expect(phases).toEqual(["RD1", "RD2", "RD3", "RD4", "RD5", "RD7", "RD6", "RD8"]);
  });
});

describe("RD9 bank channel (parallel form, not site wizard)", () => {
  it("bank create is side path — no user CTA in journey matrix", () => {
    const userCreate = actionsFor("user", "draft").some((a) => a.id.includes("bank"));
    expect(userCreate).toBe(false);
  });
});
