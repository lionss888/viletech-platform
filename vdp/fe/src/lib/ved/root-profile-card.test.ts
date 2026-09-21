import { describe, expect, it } from "vitest";

import { buildRootProfileCard, ROOT_PROFILE_PLACE_LINE } from "./root-profile-card";

describe("buildRootProfileCard", () => {
  it("returns identity fields for root without organization", () => {
    const actual = buildRootProfileCard({
      role: "root",
      fullName: "Root Admin",
      email: "root@vdp.local",
    });
    expect(actual).toEqual({
      fullName: "Root Admin",
      roleLabel: "Суперадмин",
      email: "root@vdp.local",
      placeLine: ROOT_PROFILE_PLACE_LINE,
    });
    expect(actual?.placeLine).toBe("Вне учётных записей");
    expect(JSON.stringify(actual)).not.toMatch(/организац/i);
  });

  it("falls back to email when full name is empty", () => {
    const actual = buildRootProfileCard({
      role: "root",
      fullName: "  ",
      email: "root@vdp.local",
    });
    expect(actual?.fullName).toBe("root@vdp.local");
  });

  it("returns null for non-root roles", () => {
    expect(buildRootProfileCard({ role: "manager", email: "manager@vdp.local" })).toBeNull();
    expect(buildRootProfileCard({ role: "user", fullName: "Ivan", email: "user@vdp.local" })).toBeNull();
    expect(buildRootProfileCard({ role: "provider", email: "provider@vdp.local" })).toBeNull();
    expect(buildRootProfileCard({ role: undefined, email: "x@vdp.local" })).toBeNull();
  });
});
