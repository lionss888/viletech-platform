import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SCENARIO_IDS, UI_SCENARIO_SPECS } from "./scenario-catalog";

/** Go catalog IDs from vdp/core/internal/scenarioverify/catalog.go — keep in sync. */
const GO_CATALOG_IDS = new Set([
  "happy_path_to_completed",
  "eco_reject_resubmit",
  "ico_org_pending_approve",
  "manager_payment_assign_provider",
  "provider_payment_no_pii",
  "bank_channel_badge",
  "root_cancel",
  "refund_smoke",
  "manager_hides_drafts",
  "doc_preview_visible",
  "health_core",
  "continuity_manager_form_approve",
  "manager_reject_to_corrections",
  "user_resubmit_after_reject",
  "provider_return_to_manager",
  "extraction_confirm_updates_amount",
  "manager_sets_deal_rate",
]);

const FE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("scenario-catalog mirror", () => {
  it("exposes required catalog ids", () => {
    expect(SCENARIO_IDS.happyPathToCompleted).toBe("happy_path_to_completed");
    expect(SCENARIO_IDS.providerPaymentNoPii).toBe("provider_payment_no_pii");
    expect(SCENARIO_IDS.healthCore).toBe("health_core");
  });

  it("maps UI scenarios to playwright specs", () => {
    expect(UI_SCENARIO_SPECS[SCENARIO_IDS.providerPaymentNoPii]).toContain("provider-acl");
    expect(UI_SCENARIO_SPECS[SCENARIO_IDS.ecoRejectResubmit]).toContain("reject-path");
  });

  it("every FE SCENARIO_IDS value exists in Go scenarioverify catalog", () => {
    for (const id of Object.values(SCENARIO_IDS)) {
      expect(GO_CATALOG_IDS.has(id), `missing in Go catalog: ${id}`).toBe(true);
    }
  });

  it("every UI_SCENARIO_SPECS path points at an existing Playwright file", () => {
    for (const [id, specs] of Object.entries(UI_SCENARIO_SPECS)) {
      for (const rel of specs.split(/\s+/).filter(Boolean)) {
        const abs = join(FE_ROOT, rel);
        expect(existsSync(abs), `${id} → missing ${rel}`).toBe(true);
      }
    }
  });
});
