/** Product brand shown in browser tabs and chrome. */
export const BRAND_NAME = "⚡ ВЭД от Вилетех ₽";

/** Compact mark for logo tiles (sidebar, login, landing). */
export const BRAND_MARK = "⚡";

/**
 * Favicon URLs — new paths so browsers drop the old Lovable heart cache.
 * Query bump forces a fresh fetch even if the path was seen before.
 */
export const BRAND_FAVICON_SVG = "/viletech-mark.svg?v=20260906a";
export const BRAND_FAVICON_ICO = "/viletech-mark.ico?v=20260906a";
export const BRAND_FAVICON_PNG = "/viletech-mark.png?v=20260906a";

/**
 * Builds a document title for a route.
 * @param pageName - Short page label (e.g. "Пользователи").
 */
export function pageTitle(pageName: string): string {
  return `${pageName} — ${BRAND_NAME}`;
}
