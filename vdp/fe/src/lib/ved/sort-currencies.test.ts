import { describe, expect, it } from "vitest";

import { sortCurrencyCodes, sortCurrencyRecords } from "./sort-currencies";

describe("sortCurrencyCodes", () => {
  it("puts RUB and CNY first, then CIS, then EE/ME, then rest", () => {
    const input = ["USD", "KZT", "TRY", "CNY", "PLN", "RUB", "AED", "JPY", "UZS", "EUR"];
    const actual = sortCurrencyCodes(input);
    expect(actual).toEqual(["RUB", "CNY", "KZT", "UZS", "AED", "EUR", "PLN", "TRY", "JPY", "USD"]);
  });

  it("sorts alphabetically inside a tier", () => {
    const actual = sortCurrencyCodes(["USD", "JPY", "GBP", "CHF"]);
    expect(actual).toEqual(["CHF", "GBP", "JPY", "USD"]);
  });
});

describe("sortCurrencyRecords", () => {
  it("preserves record objects in tier order", () => {
    const input = [
      { code: "USD", title: "Dollar" },
      { code: "RUB", title: "Ruble" },
      { code: "KZT", title: "Tenge" },
    ];
    const actual = sortCurrencyRecords(input);
    expect(actual.map((row) => row.code)).toEqual(["RUB", "KZT", "USD"]);
    expect(actual[0]?.title).toBe("Ruble");
  });
});
