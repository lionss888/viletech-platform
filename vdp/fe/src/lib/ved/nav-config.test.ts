import { describe, expect, it } from "vitest";

import {
  filterNav,
  filterNavGroups,
  flattenReferenceNav,
  MAIN_NAV,
  REFERENCE_FLAT,
  REFERENCE_GROUPS,
  REFERENCE_NAV,
} from "./nav-config";

describe("nav-config documents placement", () => {
  it("keeps Documents in flat reference for user and provider only", () => {
    const docs = REFERENCE_FLAT.find((item) => item.segment === "/documents");
    expect(docs).toBeDefined();
    expect(docs?.roles).toEqual(["user", "provider"]);
    expect(MAIN_NAV.some((item) => item.segment === "/documents")).toBe(false);
  });

  it("exposes Documents under references for provider", () => {
    const refs = flattenReferenceNav("provider");
    expect(refs.some((item) => item.label === "Документы" && item.segment === "/documents")).toBe(true);
    expect(filterNav(MAIN_NAV, "provider").some((item) => item.label === "Документы")).toBe(false);
  });

  it("hides application-files Documents from manager and root", () => {
    expect(flattenReferenceNav("manager").some((item) => item.segment === "/documents")).toBe(false);
    expect(flattenReferenceNav("root").some((item) => item.segment === "/documents")).toBe(false);
  });

  it("exposes forms registry for treasurer", () => {
    const main = filterNav(MAIN_NAV, "treasurer");
    expect(main.some((item) => item.segment === "/forms")).toBe(true);
  });
});

describe("nav-config nested reference groups", () => {
  it("gives manager three groups without client organizations catalog", () => {
    const groups = filterNavGroups(REFERENCE_GROUPS, "manager");
    expect(groups.map((g) => g.id)).toEqual(["organizations", "reference-info", "documents"]);
    expect(groups.find((g) => g.id === "organizations")?.items.map((i) => i.segment)).toEqual([
      "/agent-organization",
      "/provider-organizations",
      "/counterparties",
    ]);
    expect(flattenReferenceNav("manager").some((item) => item.segment === "/organizations")).toBe(false);
    expect(flattenReferenceNav("manager").some((item) => item.label === "Платёжные агенты")).toBe(true);
  });

  it("keeps root admin tail flat under references", () => {
    const flat = filterNav(REFERENCE_FLAT, "root");
    expect(flat.map((item) => item.segment)).toEqual([
      "/providers",
      "/compliance-tools",
      "/admin",
      "/process-roles",
      "/feature-flags",
      "/countries",
      "/testing",
    ]);
  });

  it("does not give nested tree to user or compliance", () => {
    expect(filterNavGroups(REFERENCE_GROUPS, "user")).toEqual([]);
    expect(filterNavGroups(REFERENCE_GROUPS, "internal_compliance_officer")).toEqual([]);
    expect(filterNavGroups(REFERENCE_GROUPS, "compliance_officer")).toEqual([]);
  });

  it("lists every leaf segment once in REFERENCE_NAV for feature flags", () => {
    const segments = REFERENCE_NAV.map((item) => item.segment);
    expect(new Set(segments).size).toBe(segments.length);
    const counterparties = REFERENCE_NAV.find((item) => item.segment === "/counterparties");
    expect(counterparties?.roles).toEqual(["manager", "root", "user"]);
  });
});
