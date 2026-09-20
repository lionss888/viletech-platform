import { describe, expect, it } from "vitest";

import {
  counterpartyGapLine,
  counterpartyPlaceLine,
  counterpartySubjectDetail,
  counterpartySwiftLine,
  innLine,
  organizationAddressLine,
  presentValue,
} from "./party-requisites";

describe("presentValue", () => {
  it("drops empty and dash sentinels", () => {
    expect(presentValue(undefined)).toBeUndefined();
    expect(presentValue("")).toBeUndefined();
    expect(presentValue("—")).toBeUndefined();
    expect(presentValue("-")).toBeUndefined();
    expect(presentValue("  —  ")).toBeUndefined();
  });

  it("keeps a real value", () => {
    expect(presentValue("Надеждия")).toBe("Надеждия");
    expect(presentValue("  BOFAUS3N  ")).toBe("BOFAUS3N");
  });
});

describe("organization lines", () => {
  it("names a missing address instead of a dash", () => {
    expect(organizationAddressLine(undefined)).toBe("Юридический адрес не указан");
    expect(organizationAddressLine("—")).toBe("Юридический адрес не указан");
    expect(organizationAddressLine("г. Москва")).toBe("г. Москва");
  });

  it("names a missing INN", () => {
    expect(innLine("—")).toBe("ИНН не указан");
    expect(innLine("7700000000")).toBe("ИНН 7700000000");
  });
});

describe("counterparty lines", () => {
  it("collapses a dash bank next to a country", () => {
    expect(counterpartyPlaceLine("Надеждия", "—")).toBe("Надеждия");
    expect(counterpartyPlaceLine("—", "—")).toBeUndefined();
    expect(counterpartySwiftLine("—")).toBeUndefined();
    expect(counterpartySwiftLine("BOFAUS3N")).toBe("SWIFT BOFAUS3N");
  });

  it("states which bank facts are missing", () => {
    expect(counterpartyGapLine("—", "—")).toBe("Банк и SWIFT не указаны");
    expect(counterpartyGapLine("Bank", "—")).toBe("SWIFT не указан");
    expect(counterpartyGapLine("—", "BOFAUS3N")).toBe("Банк не указан");
    expect(counterpartyGapLine("Bank", "BOFAUS3N")).toBeUndefined();
  });

  it("does not render SWIFT — in the subject detail", () => {
    expect(counterpartySubjectDetail("Надеждия", "—", "—")).toBe("Надеждия · Банк и SWIFT не указаны");
    expect(counterpartySubjectDetail("DE", "Deutsche Bank", "DEUTDEFF")).toBe(
      "DE · Deutsche Bank · SWIFT DEUTDEFF",
    );
  });
});
