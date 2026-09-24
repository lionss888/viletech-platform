import { describe, expect, it } from "vitest";

import { EMPTY_FLAGS, getServerFeatureFlags } from "./feature-flags";

describe("feature-flags getServerSnapshot", () => {
  it("returns the same EMPTY_FLAGS reference every call", () => {
    const first = getServerFeatureFlags();
    const second = getServerFeatureFlags();
    expect(first).toBe(EMPTY_FLAGS);
    expect(second).toBe(first);
  });
});
