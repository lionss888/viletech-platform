import { describe, expect, it } from "vitest";

import { CREATE_REVIEW_OCR_BANNER, CREATE_REVIEW_OCR_CAPTION } from "./create-review-copy";

describe("create review OCR copy", () => {
  it("mentions recognition and Vedi assistant", () => {
    expect(CREATE_REVIEW_OCR_BANNER).toMatch(/распознан/i);
    expect(CREATE_REVIEW_OCR_CAPTION).toMatch(/фоне/i);
    expect(CREATE_REVIEW_OCR_CAPTION).toMatch(/Вэди/);
  });
});
