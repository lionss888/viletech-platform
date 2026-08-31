import type { PlatformMode } from "./platform-mode";

/** Core action to skip OCR until recognition service is connected. */
export const AUTO_RECOGNIZE_AFTER_CREATE = "recognize_complete" as const;

/** Returns post-create transition for app contour; demo keeps mock flow unchanged. */
export function getPostCreateTransition(mode: PlatformMode): typeof AUTO_RECOGNIZE_AFTER_CREATE | undefined {
  return mode === "app" ? AUTO_RECOGNIZE_AFTER_CREATE : undefined;
}
