import { useEffect, useState } from "react";

import {
  CREATE_REVIEW_OCR_AUTH_LOST,
  CREATE_REVIEW_OCR_DEGRADED,
  CREATE_REVIEW_OCR_DONE,
  CREATE_REVIEW_OCR_FAILED,
  CREATE_REVIEW_OCR_PENDING,
  CREATE_REVIEW_OCR_UNAVAILABLE,
} from "@/lib/ved/create-review-copy";
import type { OcrBannerState } from "@/lib/ved/extraction";
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

function bannerCopy(state: OcrBannerState): string {
  switch (state) {
    case "unavailable":
      return CREATE_REVIEW_OCR_UNAVAILABLE;
    case "degraded":
      return CREATE_REVIEW_OCR_DEGRADED;
    case "failed":
      return CREATE_REVIEW_OCR_FAILED;
    case "auth_lost":
      return CREATE_REVIEW_OCR_AUTH_LOST;
    case "done":
      return CREATE_REVIEW_OCR_DONE;
    default:
      return CREATE_REVIEW_OCR_PENDING;
  }
}

export type OcrProgressProps = {
  /** Canonical banner state from the wizard. */
  state: OcrBannerState;
  /** Called after successful done has been shown briefly. */
  onHide?: () => void;
  /** Root testid; children derive `${testId}-bar` and state labels. */
  testId?: string;
};

/**
 * Recognition status banner: pending progress, done (auto-hide), or sticky
 * unavailable / degraded / failed / auth_lost.
 */
export function OcrProgress({ state, onHide, testId = "wizard-ocr-progress" }: OcrProgressProps) {
  const [value, setValue] = useState(OCR_PROGRESS_START);
  const reduced = usePrefersReducedMotion();
  const pending = state === "pending";
  const done = state === "done";
  const stickyFail =
    state === "failed" ||
    state === "unavailable" ||
    state === "degraded" ||
    state === "auth_lost";
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setValue((prev) => nextOcrProgress(prev, false)), TICK_MS);
    return () => clearInterval(id);
  }, [pending]);
  useEffect(() => {
    if (!done) return;
    setValue(100);
    const id = setTimeout(() => onHide?.(), DONE_HOLD_MS);
    return () => clearTimeout(id);
  }, [done, onHide]);
  const rounded = Math.round(value);
  const copy = bannerCopy(state);
  if (stickyFail) {
    const tone =
      state === "degraded"
        ? "bg-wait-soft text-wait"
        : "bg-destructive-soft text-destructive";
    return (
      <div
        className={cn("mb-4 rounded-md px-3 py-2.5", tone)}
        data-testid={testId}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium" data-testid={`${testId}-${state}`}>
          {copy}
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
        <span data-testid={done ? `${testId}-done` : "wizard-ocr-pending"}>{copy}</span>
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
