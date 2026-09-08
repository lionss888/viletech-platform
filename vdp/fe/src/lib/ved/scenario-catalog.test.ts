import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SCENARIO_IDS, UI_SCENARIO_SPECS } from "./scenario-catalog";

const here = path.dirname(fileURLToPath(import.meta.url));
const catalogGoPath = path.resolve(here, "../../../../core/internal/scenarioverify/catalog.go");
const feRoot = path.resolve(here, "../../..");

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
    const catalogGo = readFileSync(catalogGoPath, "utf8");
    for (const id of Object.values(SCENARIO_IDS)) {
      expect(catalogGo, `missing Go catalog id ${id}`).toContain(`"${id}"`);
    }
  });

  it("every UI_SCENARIO_SPECS path points at an existing Playwright file", () => {
    for (const [scenarioId, specs] of Object.entries(UI_SCENARIO_SPECS)) {
      const files = specs.split(/\s+/).filter(Boolean);
      expect(files.length, scenarioId).toBeGreaterThan(0);
      for (const rel of files) {
        const abs = path.join(feRoot, rel);
        expect(existsSync(abs), `${scenarioId} → ${rel}`).toBe(true);
      }
    }
  });
});
