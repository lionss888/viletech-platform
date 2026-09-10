import type { PlatformMode } from "./platform-mode";

/** Core action to skip OCR wait when form has no documents to recognize. */
export const AUTO_RECOGNIZE_AFTER_CREATE = "recognize_complete" as const;

export type PostCreateOptions = {
  /** True when invoice/contract files were attached (OCR path). */
  hasDocuments?: boolean;
};

/**
 * App contour: auto-skip creating→draft only when there are no docs to OCR.
 * With documents, stay in creating until hub OCR or user recognize_complete.
 */
export function getPostCreateTransition(
  mode: PlatformMode,
  opts: PostCreateOptions = {},
): typeof AUTO_RECOGNIZE_AFTER_CREATE | undefined {
  if (mode !== "app") return undefined;
  if (opts.hasDocuments) return undefined;
  return AUTO_RECOGNIZE_AFTER_CREATE;
}
