import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("exposes data-testid and canonical data-status", () => {
    const html = renderToStaticMarkup(<StatusBadge status="form_accepted" />);
    expect(html).toContain('data-testid="status-badge"');
    expect(html).toContain('data-status="form_accepted"');
  });

  it("binds data-status to the domain status code", () => {
    const html = renderToStaticMarkup(<StatusBadge status="form_waiting_corrections" />);
    expect(html).toContain('data-status="form_waiting_corrections"');
  });
});
