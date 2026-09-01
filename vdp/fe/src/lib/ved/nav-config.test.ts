import { describe, expect, it } from "vitest";

import { filterNav, MAIN_NAV, REFERENCE_NAV } from "./nav-config";

describe("nav-config documents placement", () => {
  it("keeps Documents in REFERENCE_NAV for all Lovable roles", () => {
    const docs = REFERENCE_NAV.find((item) => item.segment === "/documents");
    expect(docs).toBeDefined();
    expect(docs?.roles).toEqual(["user", "manager", "provider", "root"]);
    expect(MAIN_NAV.some((item) => item.segment === "/documents")).toBe(false);
  });

  it("exposes Documents under references for provider", () => {
    const refs = filterNav(REFERENCE_NAV, "provider");
    expect(refs.some((item) => item.label === "Документы")).toBe(true);
    expect(filterNav(MAIN_NAV, "provider").some((item) => item.label === "Документы")).toBe(false);
  });

  it("exposes profile and work chats for every role", () => {
    expect(MAIN_NAV.some((item) => item.segment === "/profile")).toBe(true);
    expect(MAIN_NAV.some((item) => item.segment === "/chats")).toBe(true);
    expect(filterNav(MAIN_NAV, "user").some((item) => item.segment === "/profile")).toBe(true);
    expect(filterNav(MAIN_NAV, "provider").some((item) => item.segment === "/chats")).toBe(true);
  });
});
