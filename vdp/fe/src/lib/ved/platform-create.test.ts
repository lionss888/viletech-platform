import { describe, expect, it } from "vitest";

import { AUTO_RECOGNIZE_AFTER_CREATE, getPostCreateTransition } from "./platform-create";

describe("getPostCreateTransition", () => {
  it("returns recognize_complete in app mode without documents", () => {
    expect(getPostCreateTransition("app")).toBe(AUTO_RECOGNIZE_AFTER_CREATE);
    expect(getPostCreateTransition("app", { hasDocuments: false })).toBe(AUTO_RECOGNIZE_AFTER_CREATE);
  });

  it("skips auto-recognize when documents are present (OCR path)", () => {
    expect(getPostCreateTransition("app", { hasDocuments: true })).toBeUndefined();
  });

  it("returns undefined in demo mode", () => {
    expect(getPostCreateTransition("demo")).toBeUndefined();
    expect(getPostCreateTransition("demo", { hasDocuments: true })).toBeUndefined();
  });
});
