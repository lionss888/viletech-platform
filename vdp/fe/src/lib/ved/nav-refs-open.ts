export const REFS_OPEN_KEY = "ved-nav-refs-open";

/** Reads the persisted "Справочники" group state; falls back to the current route. */
export function readRefsOpen(fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(REFS_OPEN_KEY);
    if (saved !== null) return saved === "1";
  } catch {
    /* приватный режим браузера — состояние необязательно */
  }
  return fallback;
}

/** Persists the group state so it survives navigation and role switches. */
export function writeRefsOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REFS_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* переполнение хранилища не должно ломать навигацию */
  }
}
