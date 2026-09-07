/** Product name in UI chrome (sidebar, login, footer) — without ⚡ / ₽. */
export const BRAND_NAME = "Веди ВЭД";

/** Document / tab titles only — the only place with ⚡ and ₽. */
export const BRAND_DOCUMENT = "⚡ Веди ВЭД ₽";

/** Compact mark for logo tiles (sidebar, login, landing) — letter V in the square. */
export const BRAND_MARK = "V";

/**
 * Favicon URLs — new paths so browsers drop the old Lovable heart cache.
 * Query bump forces a fresh fetch even if the path was seen before.
 */
export const BRAND_FAVICON_SVG = "/viletech-mark.svg?v=20260907d";
export const BRAND_FAVICON_ICO = "/viletech-mark.ico?v=20260907d";
export const BRAND_FAVICON_PNG = "/viletech-mark.png?v=20260907d";

/**
 * Builds a document title for a route (browser tab).
 * @param pageName - Short page label (e.g. "Пользователи").
 */
export function pageTitle(pageName: string): string {
  return `${pageName} — ${BRAND_DOCUMENT}`;
}
