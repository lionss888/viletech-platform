import { describe, expect, it } from "vitest";

import { reviewChecklist } from "./review-checklist";

describe("reviewChecklist", () => {
  it("names the files and empty fields on this form", () => {
    const lines = reviewChecklist({
      documents: [
        { title: "invoice.pdf", kind: "invoice" },
        { title: "agency.pdf", kind: "contract" },
      ],
      hsCode: "—",
      counterpartyName: "Test reel",
      counterpartyStatus: "not_approved",
      amountWarnings: ["Сумма в шапке не равна сумме строк."],
    });
    expect(lines.some((line) => line.includes("invoice.pdf"))).toBe(true);
    expect(lines.some((line) => line.includes("agency.pdf"))).toBe(true);
    expect(lines.some((line) => line.includes("ТН ВЭД"))).toBe(true);
    expect(lines.some((line) => line.includes("Test reel"))).toBe(true);
    expect(lines.some((line) => line.includes("шапке"))).toBe(true);
    expect(lines.at(-1)).toMatch(/взяли заявку/);
  });
});
