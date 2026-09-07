import { describe, expect, it } from "vitest";

import { BRAND_MARK, BRAND_NAME } from "./brand";

describe("brand marks", () => {
  it("keeps a single lightning in the product name and V in the square mark", () => {
    expect(BRAND_MARK).toBe("V");
    expect(BRAND_NAME).toBe("⚡ ВЭД от Вилетех ₽");
    expect([...BRAND_NAME].filter((ch) => ch === "⚡")).toHaveLength(1);
  });
});
