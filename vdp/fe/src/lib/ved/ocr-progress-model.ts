/**
 * Pure progress model for the document-recognition (OCR) banner.
 *
 * The backend exposes recognition as a binary state (pending → ready) via polling, so there is no
 * real percentage to report. To keep the wait tolerable (progress bars help even with approximate
 * accuracy) without fabricating precision, the visible value eases asymptotically toward a ceiling
 * below 100% while pending, and only reaches 100% once recognition is actually done. The value is
 * intentionally an estimate of elapsed effort, not a claim of exact completion.
 */
export const OCR_PROGRESS_START = 10;
export const OCR_PROGRESS_CEILING = 90;

/**
 * Computes the next progress value from the previous one.
 * @param prev previous value (0..100)
 * @param done whether recognition has actually completed
 * @returns next value: 100 when done, otherwise a monotonic ease toward the ceiling
 */
export function nextOcrProgress(prev: number, done: boolean): number {
  if (done) return 100;
  const base = Number.isFinite(prev) ? Math.max(OCR_PROGRESS_START, prev) : OCR_PROGRESS_START;
  if (base >= OCR_PROGRESS_CEILING) return OCR_PROGRESS_CEILING;
  const step = Math.max(0.8, (OCR_PROGRESS_CEILING - base) * 0.08);
  return Math.min(OCR_PROGRESS_CEILING, base + step);
}
