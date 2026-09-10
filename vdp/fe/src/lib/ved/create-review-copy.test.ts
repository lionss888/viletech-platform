import { describe, expect, it } from "vitest";

import {
  CREATE_REVIEW_OCR_BANNER,
  CREATE_REVIEW_OCR_CAPTION,
  CREATE_REVIEW_OCR_PENDING,
} from "./create-review-copy";

describe("create review OCR copy", () => {
  it("mentions recognition, draft/submit split, and Vedi assistant", () => {
    expect(CREATE_REVIEW_OCR_BANNER).toMatch(/распозна/i);
    expect(CREATE_REVIEW_OCR_CAPTION).toMatch(/менеджер/i);
    expect(CREATE_REVIEW_OCR_CAPTION).toMatch(/Вэди/);
    expect(CREATE_REVIEW_OCR_PENDING).toMatch(/распознавание/i);
  });
});
