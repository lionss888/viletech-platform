import { describe, expect, it } from "vitest";

import { nextOcrProgress, OCR_PROGRESS_CEILING, OCR_PROGRESS_START } from "./ocr-progress-model";

describe("nextOcrProgress", () => {
  it("returns 100 immediately when recognition is done, regardless of previous value", () => {
    for (const inputPrev of [0, OCR_PROGRESS_START, 50, OCR_PROGRESS_CEILING, 100]) {
      expect(nextOcrProgress(inputPrev, true)).toBe(100);
    }
  });

  it("increases monotonically toward the ceiling while pending", () => {
    let value = 0;
    for (let i = 0; i < 200; i += 1) {
      const next = nextOcrProgress(value, false);
      expect(next).toBeGreaterThanOrEqual(value);
      expect(next).toBeLessThanOrEqual(OCR_PROGRESS_CEILING);
      value = next;
    }
    expect(value).toBe(OCR_PROGRESS_CEILING);
  });

  it("never exceeds the ceiling while pending and clamps overshoot back to the ceiling", () => {
    expect(nextOcrProgress(OCR_PROGRESS_CEILING, false)).toBe(OCR_PROGRESS_CEILING);
    expect(nextOcrProgress(95, false)).toBe(OCR_PROGRESS_CEILING);
  });

  it("starts moving from a visible floor even if previous is below the start", () => {
    const actual = nextOcrProgress(0, false);
    expect(actual).toBeGreaterThan(OCR_PROGRESS_START);
  });
});
