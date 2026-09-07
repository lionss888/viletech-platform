import { describe, expect, it } from "vitest";

import { correctionHints, isRateCorrection, sectionLabel } from "./correction-guidance";

describe("correction guidance", () => {
  it("detects rate marks", () => {
    expect(isRateCorrection("Курс не согласован")).toBe(true);
    expect(isRateCorrection("Не хватает инвойса")).toBe(false);
  });

  it("builds checklist from mark and text", () => {
    const hints = correctionHints("Курс не согласован", "согласуйте курс пожалуйста");
    expect(hints.length).toBeGreaterThanOrEqual(1);
    expect(hints.some((h) => h.section === "rate")).toBe(true);
    expect(sectionLabel("rate")).toMatch(/Курс/);
  });
});
