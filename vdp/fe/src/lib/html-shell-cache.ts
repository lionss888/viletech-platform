/**
 * Force the HTML shell to always revalidate so a fresh deploy is picked up immediately.
 *
 * Rationale: hashed client assets under `/assets/**` are content-addressed and served with
 * `Cache-Control: public, max-age=31536000, immutable`. The SSR HTML document, however, is the
 * entry point that references those hashed chunk names. If a browser or CDN caches the HTML shell,
 * users keep loading an old document that points at stale chunks even after a new deploy. Marking
 * the HTML shell `no-cache` makes the browser revalidate it on every navigation, so a new deploy is
 * served right away without the user manually clearing anything.
 *
 * Scope is intentionally narrow:
 * - Only `text/html` responses are touched (JSON, API, and server-fn responses are left as-is).
 * - An already-present `Cache-Control` header is respected and never overwritten.
 * - Saved credentials live in the browser password manager, not the HTTP cache, so they are
 *   unaffected by this header.
 */
export function applyHtmlShellCacheControl(response: Response): Response {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  if (response.headers.has("cache-control")) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
