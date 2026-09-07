import { describe, expect, it } from "vitest";

import { BRAND_DOCUMENT, BRAND_MARK, BRAND_NAME, pageTitle } from "./brand";

describe("brand marks", () => {
  it("keeps ⚡ and ₽ only in document titles; sidebar name is plain Веди ВЭД", () => {
    expect(BRAND_MARK).toBe("V");
    expect(BRAND_NAME).toBe("Веди ВЭД");
    expect(BRAND_NAME.includes("Вилетех")).toBe(false);
    expect(BRAND_NAME.includes("⚡")).toBe(false);
    expect(BRAND_NAME.includes("₽")).toBe(false);
    expect(BRAND_DOCUMENT).toBe("⚡ Веди ВЭД ₽");
    expect([...BRAND_DOCUMENT].filter((ch) => ch === "⚡")).toHaveLength(1);
    expect(BRAND_DOCUMENT.includes("₽")).toBe(true);
    expect(pageTitle("Рабочий стол")).toBe("Рабочий стол — ⚡ Веди ВЭД ₽");
  });
});
