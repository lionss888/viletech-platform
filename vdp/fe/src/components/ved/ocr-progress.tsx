import { useEffect, useState } from "react";

import {
  CREATE_REVIEW_OCR_DONE,
  CREATE_REVIEW_OCR_FAILED,
  CREATE_REVIEW_OCR_PENDING,
} from "@/lib/ved/create-review-copy";
import { nextOcrProgress, OCR_PROGRESS_START } from "@/lib/ved/ocr-progress-model";
import { cn } from "@/lib/utils";

const TICK_MS = 220;
const DONE_HOLD_MS = 1800;

/**
 * Tracks the user's reduced-motion preference so we can disable the width transition.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export type OcrProgressProps = {
  /** Whether recognition has actually completed (prefill applied). */
  done: boolean;
  /** Poll timed out without ExtractionResult — honest fail, no fake progress. */
  failed?: boolean;
  /** Called after the completed state has been shown briefly, so the parent can unmount it. */
  onHide?: () => void;
  /** Root testid; children derive `${testId}-bar` and state labels. */
  testId?: string;
};

/**
 * Recognition progress banner. Eases toward a sub-100% ceiling while pending and snaps to 100% with
 * a success message once `done`, then asks the parent to hide it. See `ocr-progress-model` for why
 * the value is an honest estimate rather than a backend-reported percentage.
 */
export function OcrProgress({
  done,
  failed = false,
  onHide,
  testId = "wizard-ocr-progress",
}: OcrProgressProps) {
  const [value, setValue] = useState(OCR_PROGRESS_START);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (done || failed) return;
    const id = setInterval(() => setValue((prev) => nextOcrProgress(prev, false)), TICK_MS);
    return () => clearInterval(id);
  }, [done, failed]);
  useEffect(() => {
    if (!done) return;
    setValue(100);
    const id = setTimeout(() => onHide?.(), DONE_HOLD_MS);
    return () => clearTimeout(id);
  }, [done, onHide]);
  const rounded = Math.round(value);
  if (failed) {
    return (
      <div
        className="mb-4 rounded-md bg-destructive-soft px-3 py-2.5 text-destructive"
        data-testid={testId}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium" data-testid={`${testId}-failed`}>
          {CREATE_REVIEW_OCR_FAILED}
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "mb-4 rounded-md px-3 py-2.5",
        done ? "bg-done-soft text-done" : "bg-wait-soft text-wait",
      )}
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {done ? (
          <span aria-hidden="true">✓</span>
        ) : (
          <span
            aria-hidden="true"
            className={cn("inline-block h-2 w-2 rounded-full bg-current", !reduced && "animate-pulse")}
          />
        )}
        <span data-testid={done ? `${testId}-done` : "wizard-ocr-pending"}>
          {done ? CREATE_REVIEW_OCR_DONE : CREATE_REVIEW_OCR_PENDING}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-current/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={done ? "Распознавание завершено" : "Идёт распознавание"}
        data-testid={`${testId}-bar`}
      >
        <div
          className={cn("h-full rounded-full bg-current", !reduced && "transition-[width] duration-300 ease-out")}
          style={{ width: `${rounded}%` }}
        />
      </div>
    </div>
  );
}
