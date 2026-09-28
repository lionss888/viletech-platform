import { describe, expect, it } from "vitest";

import {
  blocksSubmitWithoutDocuments,
  hasAnyDocument,
  isUserSubmitAction,
  SUBMIT_DOCS_REQUIRED_LOCK,
} from "./submit-docs-gate";

describe("submit docs gate", () => {
  it("locks only user submit action ids", () => {
    expect(isUserSubmitAction("submit")).toBe(true);
    expect(isUserSubmitAction("submit_corr")).toBe(true);
    expect(isUserSubmitAction("accept_form")).toBe(true);
    expect(isUserSubmitAction("eco_form_accept")).toBe(false);
    expect(isUserSubmitAction("cancel_by_user")).toBe(false);
  });

  it("treats any attached document as enough", () => {
    expect(hasAnyDocument([])).toBe(false);
    expect(hasAnyDocument([{ kind: "contract" }])).toBe(true);
    expect(hasAnyDocument([{ kind: "invoice" }])).toBe(true);
  });

  it("blocks submit when documents are empty", () => {
    expect(blocksSubmitWithoutDocuments("submit", [])).toBe(true);
    expect(blocksSubmitWithoutDocuments("submit_corr", [])).toBe(true);
    expect(blocksSubmitWithoutDocuments("accept_form", [])).toBe(true);
    expect(blocksSubmitWithoutDocuments("submit", [{ kind: "invoice" }])).toBe(false);
    expect(blocksSubmitWithoutDocuments("eco_form_accept", [])).toBe(false);
  });

  it("keeps the disabled-button reason", () => {
    expect(SUBMIT_DOCS_REQUIRED_LOCK).toBe("Нужен хотя бы один документ");
  });
});
