import { describe, expect, it } from "vitest";

import { counterpartyListLabel, isDocsCorrection } from "./counterparty-display";

describe("counterparty-display", () => {
  it("labels missing id as not specified", () => {
    expect(counterpartyListLabel([], undefined)).toBe("контрагент не указан");
    expect(counterpartyListLabel([], "—")).toBe("контрагент не указан");
  });

  it("uses catalog name when present", () => {
    expect(counterpartyListLabel([{ id: "a", name: "ACME" }], "a")).toBe("ACME");
  });

  it("does not claim missing when id set but catalog lag", () => {
    expect(counterpartyListLabel([], "cp-uuid")).toBe("контрагент выбран");
  });

  it("detects docs reject mark", () => {
    expect(isDocsCorrection("docs")).toBe(true);
    expect(isDocsCorrection(undefined, "уточните инвойс")).toBe(true);
    expect(isDocsCorrection("Курс не согласован")).toBe(false);
  });
});
