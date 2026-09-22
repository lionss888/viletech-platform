import { describe, expect, it } from "vitest";

import {
  CREATE_REVIEW_OCR_AUTH_LOST,
  CREATE_REVIEW_OCR_BANNER,
  CREATE_REVIEW_OCR_CAPTION,
  CREATE_REVIEW_OCR_DEGRADED,
  CREATE_REVIEW_OCR_FAILED,
  CREATE_REVIEW_OCR_PENDING,
  CREATE_REVIEW_OCR_UNAVAILABLE,
} from "./create-review-copy";

describe("create review OCR copy", () => {
  it("mentions recognition, draft/submit split, and Vedi assistant", () => {
    expect(CREATE_REVIEW_OCR_BANNER).toMatch(/распозна/i);
    expect(CREATE_REVIEW_OCR_BANNER).toMatch(/подстав/i);
    expect(CREATE_REVIEW_OCR_CAPTION).toMatch(/менеджер/i);
    expect(CREATE_REVIEW_OCR_CAPTION).toMatch(/Вэди/);
    expect(CREATE_REVIEW_OCR_PENDING).toMatch(/распознавание/i);
    expect(CREATE_REVIEW_OCR_FAILED).toMatch(/вручную/i);
  });

  it("covers unavailable, degraded, and auth_lost without promising autofill", () => {
    expect(CREATE_REVIEW_OCR_UNAVAILABLE).toMatch(/недоступн/i);
    expect(CREATE_REVIEW_OCR_UNAVAILABLE).toMatch(/вручную/i);
    expect(CREATE_REVIEW_OCR_DEGRADED).toMatch(/провер/i);
    expect(CREATE_REVIEW_OCR_AUTH_LOST).toMatch(/сессия/i);
  });
});
