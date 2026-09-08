import { describe, expect, it } from "vitest";

import { resolveCatalogBundle, staticCatalogSeed } from "./catalog-source";

describe("catalog-source", () => {
  it("static seed has at least 30 entries per registry", () => {
    const seed = staticCatalogSeed();
    expect(seed.providers.length).toBeGreaterThanOrEqual(30);
    expect(seed.currencies.length).toBeGreaterThanOrEqual(30);
    expect(seed.hsCodes.length).toBeGreaterThanOrEqual(30);
    expect(seed.countries.length).toBeGreaterThanOrEqual(30);
    expect(seed.complianceTools.length).toBeGreaterThanOrEqual(30);
  });

  it("api mode keeps providers empty without mock bleed; currencies/HS use platform seed", () => {
    const bundle = resolveCatalogBundle("api", {});
    expect(bundle.providers).toEqual([]);
    expect(bundle.currencies.length).toBeGreaterThanOrEqual(30);
    expect(bundle.hsCodes.length).toBeGreaterThanOrEqual(30);
    expect(bundle.countries.length).toBeGreaterThanOrEqual(30);
  });

  it("api mode uses API providers when present", () => {
    const bundle = resolveCatalogBundle("api", {
      providers: [{ id: "p1", name: "Real", country: "HK", corridors: "USD", contact: "a@b.c", slaHours: 1, status: "active" }],
    });
    expect(bundle.providers).toHaveLength(1);
    expect(bundle.providers[0]?.id).toBe("p1");
  });
});
