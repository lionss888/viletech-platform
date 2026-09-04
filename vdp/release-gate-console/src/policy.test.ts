import { describe, expect, it } from "vitest";
import { domainIsProduct } from "./policy";

describe("gamma product tag policy", () => {
  it("accepts vdp-v tags", () => {
    expect(domainIsProduct("vdp-v1.2.3")).toBe(true);
  });

  it("rejects sha tags", () => {
    expect(domainIsProduct("sha-abc1234")).toBe(false);
  });
});
