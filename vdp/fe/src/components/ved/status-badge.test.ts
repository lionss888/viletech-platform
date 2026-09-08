import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge status contract", () => {
  it("exposes data-testid and canonical data-status", () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { status: "form_accepted" }));
    expect(html).toContain('data-testid="status-badge"');
    expect(html).toContain('data-status="form_accepted"');
  });

  it("keeps data-status stable across process-role label changes", () => {
    const html = renderToStaticMarkup(
      createElement(StatusBadge, { status: "form_waiting_verification", viewerRole: "manager" }),
    );
    expect(html).toContain('data-status="form_waiting_verification"');
  });
});
