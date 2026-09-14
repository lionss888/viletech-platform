import { describe, expect, it } from "vitest";

import { applyHtmlShellCacheControl } from "./html-shell-cache";

describe("applyHtmlShellCacheControl", () => {
  it("adds no-cache to an HTML shell response without cache-control", () => {
    const inputResponse = new Response("<!doctype html><html></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    const actualResponse = applyHtmlShellCacheControl(inputResponse);
    expect(actualResponse.headers.get("cache-control")).toBe("no-cache");
  });

  it("preserves an existing cache-control header on HTML", () => {
    const inputResponse = new Response("<!doctype html>", {
      status: 200,
      headers: { "content-type": "text/html", "cache-control": "private, max-age=60" },
    });
    const actualResponse = applyHtmlShellCacheControl(inputResponse);
    expect(actualResponse.headers.get("cache-control")).toBe("private, max-age=60");
  });

  it("does not touch non-HTML responses (JSON stays uncached by this layer)", () => {
    const inputResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const actualResponse = applyHtmlShellCacheControl(inputResponse);
    expect(actualResponse.headers.has("cache-control")).toBe(false);
  });

  it("preserves status and body of the HTML shell", async () => {
    const inputBody = "<!doctype html><html><body>hi</body></html>";
    const inputResponse = new Response(inputBody, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    const actualResponse = applyHtmlShellCacheControl(inputResponse);
    expect(actualResponse.status).toBe(200);
    expect(await actualResponse.text()).toBe(inputBody);
  });
});
