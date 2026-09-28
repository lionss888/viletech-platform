import { describe, expect, it } from "vitest";

import { documentDeleteConfirmCopy } from "./DocumentViewer";

describe("documentDeleteConfirmCopy", () => {
  it("names the file in the destructive confirm body", () => {
    const actual = documentDeleteConfirmCopy("invoice-42.pdf");
    expect(actual.title).toBe("Удалить документ?");
    expect(actual.description).toContain("«invoice-42.pdf»");
    expect(actual.description).toMatch(/нельзя отменить/i);
  });

  it("falls back when title is blank", () => {
    const actual = documentDeleteConfirmCopy("   ");
    expect(actual.description).toContain("«файл»");
  });
});
