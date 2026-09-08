import { describe, expect, it } from "vitest";

import type { PlatformHealthSnapshot } from "@/lib/api/platform-health";

function requiredHealthy(snap: PlatformHealthSnapshot): boolean {
  return snap.summary.down === 0;
}

describe("platform health summary helpers", () => {
  it("treats only required downs as unhealthy", () => {
    const snap: PlatformHealthSnapshot = {
      checked_at: "2026-01-01T00:00:00Z",
      environment: "development",
      allows_mutating_runs: true,
      summary: { up: 5, degraded: 0, down: 0, optional_down: 1, total: 6 },
      services: [],
      signals: [],
    };
    expect(requiredHealthy(snap)).toBe(true);
    snap.summary.down = 1;
    expect(requiredHealthy(snap)).toBe(false);
  });
});
