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

  it("api mode falls back to static when empty", () => {
    const bundle = resolveCatalogBundle("api", {});
    expect(bundle.providers.length).toBeGreaterThanOrEqual(30);
  });
});
